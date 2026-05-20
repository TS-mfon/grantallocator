# {"Depends": "py-genlayer:test"}

from dataclasses import dataclass
import json

from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"


def _parse_json_dict(raw: str) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _parse_json_list(raw: str) -> list:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _vote_key(proposal_id: str, member_address: Address) -> str:
    return proposal_id + ":" + member_address.as_hex


@allow_storage
@dataclass
class Proposal:
    applicant: str
    title: str
    description: str
    requested_amount_usd_cents: u256
    team_background: str
    team_links_json: str
    milestones_json: str
    market_context_json: str
    due_diligence_json: str
    status: str
    ai_packet_json: str
    committee_votes_for: u256
    committee_votes_against: u256
    committee_votes_abstain: u256
    created_tick: u256
    vote_end_tick: u256
    executed: bool
    approved_amount_usd_cents: u256
    released_amount_usd_cents: u256
    arc_grant_id: str


class GrantAllocatorDAO(gl.Contract):
    owner: Address
    dao_mission: str
    score_threshold: u256
    quorum: u256
    voting_period: u256
    treasury_balance_usd_cents: u256
    arc_treasury_address: str
    usdc_token_address: str
    proposal_nonce: u256
    tick: u256
    proposals: TreeMap[str, Proposal]
    proposal_order: DynArray[str]
    member_votes: TreeMap[str, str]
    committee_members: TreeMap[str, bool]
    committee_member_order: DynArray[str]
    disbursement_history: DynArray[str]

    def __init__(
        self,
        dao_mission: str,
        score_threshold: u256 = 72,
        quorum: u256 = 2,
        voting_period: u256 = 72,
        initial_treasury_usd_cents: u256 = 0,
        arc_treasury_address: str = "",
        usdc_token_address: str = "",
    ):
        self.owner = gl.message.sender_address
        self.dao_mission = dao_mission[:3000]
        self.score_threshold = score_threshold
        self.quorum = quorum
        self.voting_period = voting_period
        self.treasury_balance_usd_cents = initial_treasury_usd_cents
        self.arc_treasury_address = arc_treasury_address[:80]
        self.usdc_token_address = usdc_token_address[:80]
        self.proposal_nonce = 0
        self.tick = 0

    def _next_tick(self) -> u256:
        self.tick += 1
        return self.tick

    def _is_committee_or_owner(self, member: Address) -> bool:
        if member == self.owner:
            return True
        return bool(self.committee_members.get(member.as_hex, False))

    def _proposal_to_dict(self, proposal_id: str, proposal: Proposal) -> dict:
        return {
            "proposal_id": proposal_id,
            "applicant": proposal.applicant,
            "title": proposal.title,
            "description": proposal.description,
            "requested_amount_usd_cents": int(proposal.requested_amount_usd_cents),
            "team_background": proposal.team_background,
            "team_links": _parse_json_dict(proposal.team_links_json),
            "milestones": _parse_json_list(proposal.milestones_json),
            "market_context": _parse_json_dict(proposal.market_context_json),
            "due_diligence": _parse_json_dict(proposal.due_diligence_json),
            "status": proposal.status,
            "ai_packet": _parse_json_dict(proposal.ai_packet_json),
            "committee_votes_for": int(proposal.committee_votes_for),
            "committee_votes_against": int(proposal.committee_votes_against),
            "committee_votes_abstain": int(proposal.committee_votes_abstain),
            "executed": proposal.executed,
            "approved_amount_usd_cents": int(proposal.approved_amount_usd_cents),
            "released_amount_usd_cents": int(proposal.released_amount_usd_cents),
            "arc_grant_id": proposal.arc_grant_id,
        }

    def _evaluate_proposal(self, proposal_id: str) -> dict:
        proposal = self.proposals[proposal_id]

        def leader_fn():
            prompt = f"""
Mission: {self.dao_mission}

Application:
Title: {proposal.title}
Description: {proposal.description}
Requested USD Cents: {int(proposal.requested_amount_usd_cents)}
Team Background: {proposal.team_background}
Team Links JSON: {proposal.team_links_json}
Milestones JSON: {proposal.milestones_json}
Market Context JSON: {proposal.market_context_json}
Due Diligence JSON: {proposal.due_diligence_json}

Return JSON only:
{{
  "impact": 0-25,
  "feasibility": 0-20,
  "alignment": 0-20,
  "market_sentiment": 0-10,
  "narrative_fit": 0-10,
  "trust_score": 0-15,
  "composite": 0-100,
  "recommended_amount_usd_cents": 0,
  "rationale": "short explanation",
  "risk_flags": ["flag"]
}}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Non-dict response")
            rationale = str(result.get("rationale", "")).strip()[:1500]
            if not rationale:
                raise gl.vm.UserError(f"{ERROR_LLM} missing rationale")
            risk_flags = result.get("risk_flags", [])
            if not isinstance(risk_flags, list):
                risk_flags = []

            def _clamp(field: str, low: int, high: int) -> int:
                return max(low, min(high, int(float(str(result.get(field, 0)).strip()))))

            impact = _clamp("impact", 0, 25)
            feasibility = _clamp("feasibility", 0, 20)
            alignment = _clamp("alignment", 0, 20)
            market_sentiment = _clamp("market_sentiment", 0, 10)
            narrative_fit = _clamp("narrative_fit", 0, 10)
            trust_score = _clamp("trust_score", 0, 15)
            recommended = max(0, int(float(str(result.get("recommended_amount_usd_cents", 0)).strip())))
            composite = impact + feasibility + alignment + market_sentiment + narrative_fit + trust_score
            return {
                "impact": impact,
                "feasibility": feasibility,
                "alignment": alignment,
                "market_sentiment": market_sentiment,
                "narrative_fit": narrative_fit,
                "trust_score": trust_score,
                "composite": composite,
                "recommended_amount_usd_cents": min(recommended, int(proposal.requested_amount_usd_cents)),
                "rationale": rationale,
                "risk_flags": [str(flag)[:160] for flag in risk_flags[:6]],
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            leader = leaders_res.calldata
            validator = leader_fn()
            return abs(int(leader.get("composite", 0)) - int(validator.get("composite", 0))) <= 20

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _review_milestone(self, proposal_id: str, milestone_id: str) -> dict:
        proposal = self.proposals[proposal_id]
        milestones = _parse_json_list(proposal.milestones_json)
        target = None
        for milestone in milestones:
            if isinstance(milestone, dict) and str(milestone.get("milestone_id", "")) == milestone_id:
                target = milestone
                break
        if not isinstance(target, dict):
            raise gl.UserError(f"{ERROR_EXPECTED} Milestone not found")

        def leader_fn():
            prompt = f"""
Grant Mission: {self.dao_mission}
Proposal Title: {proposal.title}
Milestone JSON: {json.dumps(target, sort_keys=True)}
Due Diligence JSON: {proposal.due_diligence_json}
Market Context JSON: {proposal.market_context_json}

Return JSON only:
{{
  "completion_score": 0-100,
  "release_recommendation": true,
  "summary": "short explanation",
  "risk_flags": ["flag"]
}}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Non-dict response")
            summary = str(result.get("summary", "")).strip()[:1000]
            if not summary:
                raise gl.vm.UserError(f"{ERROR_LLM} missing summary")
            completion_score = max(0, min(100, int(float(str(result.get("completion_score", 0)).strip()))))
            risk_flags = result.get("risk_flags", [])
            if not isinstance(risk_flags, list):
                risk_flags = []
            return {
                "completion_score": completion_score,
                "release_recommendation": bool(result.get("release_recommendation", completion_score >= 70)),
                "summary": summary,
                "risk_flags": [str(flag)[:160] for flag in risk_flags[:5]],
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            leader = leaders_res.calldata
            validator = leader_fn()
            return abs(int(leader.get("completion_score", 0)) - int(validator.get("completion_score", 0))) <= 25

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    @gl.public.write
    def set_committee_member(self, member_address: str, allowed: bool) -> bool:
        if gl.message.sender_address != self.owner:
            raise gl.UserError(f"{ERROR_EXPECTED} Only owner")
        if member_address not in self.committee_members:
            self.committee_member_order.append(member_address)
        self.committee_members[member_address] = allowed
        return True

    @gl.public.write
    def configure_arc_treasury(self, arc_treasury_address: str, usdc_token_address: str) -> bool:
        if gl.message.sender_address != self.owner:
            raise gl.UserError(f"{ERROR_EXPECTED} Only owner")
        self.arc_treasury_address = arc_treasury_address[:80]
        self.usdc_token_address = usdc_token_address[:80]
        return True

    @gl.public.write
    def submit_application(
        self,
        title: str,
        description: str,
        requested_amount_usd_cents: u256,
        team_background: str,
        team_links_json: str,
        milestones_json: str,
        market_context_json: str,
        due_diligence_json: str,
    ) -> str:
        proposal_id = "proposal-" + str(int(self.proposal_nonce))
        self.proposal_nonce += 1
        created_tick = self._next_tick()
        proposal = Proposal(
            applicant=gl.message.sender_address.as_hex,
            title=title[:120],
            description=description[:2500],
            requested_amount_usd_cents=requested_amount_usd_cents,
            team_background=team_background[:1200],
            team_links_json=team_links_json[:3000],
            milestones_json=milestones_json[:12000],
            market_context_json=market_context_json[:3000],
            due_diligence_json=due_diligence_json[:5000],
            status="PENDING_EVALUATION",
            ai_packet_json="{}",
            committee_votes_for=u256(0),
            committee_votes_against=u256(0),
            committee_votes_abstain=u256(0),
            created_tick=created_tick,
            vote_end_tick=created_tick + int(self.voting_period),
            executed=False,
            approved_amount_usd_cents=u256(0),
            released_amount_usd_cents=u256(0),
            arc_grant_id="",
        )
        self.proposals[proposal_id] = proposal
        self.proposal_order.append(proposal_id)

        ai_packet = self._evaluate_proposal(proposal_id)
        proposal.ai_packet_json = json.dumps(ai_packet, sort_keys=True)
        proposal.approved_amount_usd_cents = u256(int(ai_packet.get("recommended_amount_usd_cents", 0)))
        proposal.status = "PENDING_VOTE" if int(ai_packet.get("composite", 0)) >= int(self.score_threshold) else "REJECTED_BY_AI"
        self.proposals[proposal_id] = proposal
        return proposal_id

    @gl.public.write
    def cast_vote(self, proposal_id: str, vote: str) -> str:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.status != "PENDING_VOTE":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal not open for voting")
        if not self._is_committee_or_owner(gl.message.sender_address):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Not committee")
        vote_key = _vote_key(proposal_id, gl.message.sender_address)
        if vote_key in self.member_votes:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Already voted")
        normalized = vote.strip().upper()
        if normalized not in ["FOR", "AGAINST", "ABSTAIN"]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Invalid vote")
        self.member_votes[vote_key] = normalized
        if normalized == "FOR":
            proposal.committee_votes_for += 1
        elif normalized == "AGAINST":
            proposal.committee_votes_against += 1
        else:
            proposal.committee_votes_abstain += 1
        self.proposals[proposal_id] = proposal
        return "vote-recorded"

    @gl.public.write
    def execute_proposal(self, proposal_id: str) -> str:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.status != "PENDING_VOTE":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal not in voting state")
        if proposal.executed:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal already executed")
        total_votes = int(proposal.committee_votes_for) + int(proposal.committee_votes_against) + int(proposal.committee_votes_abstain)
        if total_votes < int(self.quorum):
            proposal.status = "LAPSED"
            self.proposals[proposal_id] = proposal
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Quorum not met")
        if int(proposal.committee_votes_for) <= int(proposal.committee_votes_against):
            proposal.status = "REJECTED"
            self.proposals[proposal_id] = proposal
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal did not pass")
        if int(self.treasury_balance_usd_cents) < int(proposal.approved_amount_usd_cents):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Insufficient treasury")
        proposal.status = "APPROVED"
        proposal.executed = True
        proposal.arc_grant_id = "arc-grant-" + proposal_id
        self.proposals[proposal_id] = proposal
        self.disbursement_history.append(
            json.dumps(
                {
                    "type": "grant_approved",
                    "proposal_id": proposal_id,
                    "approved_amount_usd_cents": int(proposal.approved_amount_usd_cents),
                    "arc_grant_id": proposal.arc_grant_id,
                },
                sort_keys=True,
            )
        )
        return "proposal-approved"

    @gl.public.write
    def submit_milestone_evidence(self, proposal_id: str, milestone_id: str, evidence_uri: str, note: str) -> bool:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.applicant != gl.message.sender_address.as_hex:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only applicant")
        milestones = _parse_json_list(proposal.milestones_json)
        updated = []
        found = False
        for item in milestones:
            milestone = item if isinstance(item, dict) else {}
            if str(milestone.get("milestone_id", "")) == milestone_id:
                milestone["evidence_uri"] = evidence_uri[:500]
                milestone["evidence_note"] = note[:500]
                milestone["status"] = "EVIDENCE_SUBMITTED"
                found = True
            updated.append(milestone)
        if not found:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone not found")
        proposal.milestones_json = json.dumps(updated, sort_keys=True)
        proposal.status = "MILESTONE_REVIEW"
        self.proposals[proposal_id] = proposal
        return True

    @gl.public.write
    def review_milestone(self, proposal_id: str, milestone_id: str) -> dict:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        result = self._review_milestone(proposal_id, milestone_id)
        milestones = _parse_json_list(proposal.milestones_json)
        updated = []
        for item in milestones:
            milestone = item if isinstance(item, dict) else {}
            if str(milestone.get("milestone_id", "")) == milestone_id:
                milestone["ai_review"] = result
                milestone["status"] = "READY_FOR_RELEASE" if result.get("release_recommendation", False) else "REVISION_REQUESTED"
            updated.append(milestone)
        proposal.milestones_json = json.dumps(updated, sort_keys=True)
        proposal.status = "READY_FOR_RELEASE" if result.get("release_recommendation", False) else "REVISION_REQUESTED"
        self.proposals[proposal_id] = proposal
        return result

    @gl.public.write
    def release_tranche(self, proposal_id: str, milestone_id: str, arc_tx_hash: str) -> bool:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only owner")
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.status not in ["READY_FOR_RELEASE", "ACTIVE_MILESTONES", "APPROVED"]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal not ready for release")
        milestones = _parse_json_list(proposal.milestones_json)
        updated = []
        release_amount = 0
        found = False
        all_paid = True
        for item in milestones:
            milestone = item if isinstance(item, dict) else {}
            if str(milestone.get("milestone_id", "")) == milestone_id:
                if milestone.get("status") != "READY_FOR_RELEASE":
                    raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone not ready")
                if milestone.get("paid", False):
                    raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone already paid")
                release_amount = int(milestone.get("amount_usd_cents", 0))
                milestone["paid"] = True
                milestone["arc_tx_hash"] = arc_tx_hash[:160]
                milestone["status"] = "PAID"
                found = True
            if milestone.get("status") != "PAID":
                all_paid = False
            updated.append(milestone)
        if not found:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone not found")
        if int(self.treasury_balance_usd_cents) < release_amount:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Insufficient treasury")
        self.treasury_balance_usd_cents -= release_amount
        proposal.released_amount_usd_cents += release_amount
        proposal.milestones_json = json.dumps(updated, sort_keys=True)
        proposal.status = "COMPLETED" if all_paid else "ACTIVE_MILESTONES"
        self.proposals[proposal_id] = proposal
        self.disbursement_history.append(
            json.dumps(
                {
                    "type": "tranche_release",
                    "proposal_id": proposal_id,
                    "milestone_id": milestone_id,
                    "amount_usd_cents": release_amount,
                    "arc_tx_hash": arc_tx_hash[:160],
                },
                sort_keys=True,
            )
        )
        return True

    @gl.public.write
    def fund_treasury(self, amount_usd_cents: u256) -> u256:
        self.treasury_balance_usd_cents += int(amount_usd_cents)
        self.disbursement_history.append(
            json.dumps({"type": "funding", "amount_usd_cents": int(amount_usd_cents)}, sort_keys=True)
        )
        return self.treasury_balance_usd_cents

    @gl.public.write
    def update_threshold(self, new_threshold: u256) -> bool:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only owner")
        self.score_threshold = max(0, min(100, int(new_threshold)))
        return True

    @gl.public.write
    def update_mission(self, new_mission: str) -> bool:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only owner")
        self.dao_mission = new_mission[:3000]
        return True

    @gl.public.write
    def cancel_proposal(self, proposal_id: str) -> bool:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.applicant != gl.message.sender_address.as_hex:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only applicant")
        if proposal.status not in ["PENDING_EVALUATION", "PENDING_VOTE"]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal cannot be cancelled")
        proposal.status = "CANCELLED"
        self.proposals[proposal_id] = proposal
        return True

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> dict:
        if proposal_id not in self.proposals:
            return {}
        return self._proposal_to_dict(proposal_id, self.proposals[proposal_id])

    @gl.public.view
    def get_all_proposals(self, status_filter: str = "") -> list[dict]:
        items: list[dict] = []
        for proposal_id in self.proposal_order:
            proposal = self.proposals[proposal_id]
            if status_filter and proposal.status != status_filter:
                continue
            items.append(self._proposal_to_dict(proposal_id, proposal))
        return items

    @gl.public.view
    def get_passed_screening_proposals(self) -> list[dict]:
        return self.get_all_proposals("PENDING_VOTE")

    @gl.public.view
    def get_treasury_balance(self) -> u256:
        return self.treasury_balance_usd_cents

    @gl.public.view
    def get_treasury_summary(self) -> dict:
        return {
            "treasury_balance_usd_cents": int(self.treasury_balance_usd_cents),
            "arc_treasury_address": self.arc_treasury_address,
            "usdc_token_address": self.usdc_token_address,
        }

    @gl.public.view
    def get_dao_mission(self) -> str:
        return self.dao_mission

    @gl.public.view
    def get_score_threshold(self) -> u256:
        return self.score_threshold

    @gl.public.view
    def get_voting_period(self) -> u256:
        return self.voting_period

    @gl.public.view
    def get_member_vote(self, proposal_id: str, member_address: str) -> str:
        return self.member_votes.get(_vote_key(proposal_id, Address(member_address)), "")

    @gl.public.view
    def get_my_proposals(self, wallet_address: str) -> list[dict]:
        items: list[dict] = []
        for proposal_id in self.proposal_order:
            proposal = self.proposals[proposal_id]
            if proposal.applicant == wallet_address:
                items.append(self._proposal_to_dict(proposal_id, proposal))
        return items

    @gl.public.view
    def get_disbursement_history(self) -> list[dict]:
        results: list[dict] = []
        for item in self.disbursement_history:
            results.append(_parse_json_dict(item))
        return results

    @gl.public.view
    def get_committee_members(self) -> list[str]:
        items: list[str] = []
        for member_address in self.committee_member_order:
            if self.committee_members.get(member_address, False):
                items.append(member_address)
        return items


def test_grant_allocator() -> None:
    milestones = json.dumps(
        [
            {
                "milestone_id": "ms-1",
                "title": "Prototype",
                "description": "Ship the first working release.",
                "amount_usd_cents": 250000,
                "status": "PLANNED",
            }
        ],
        sort_keys=True,
    )
    contract = GrantAllocatorDAO(
        "Fund high-impact web3 public goods.",
        initial_treasury_usd_cents=u256(1_000_000),
        arc_treasury_address="0xArcTreasury",
        usdc_token_address="0xUSDC",
    )
    contract.set_committee_member(contract.owner.as_hex, True)
    proposal_id = contract.submit_application(
        "Ship an indexer",
        "Build a grants analytics indexer for ecosystem teams.",
        u256(250000),
        "Team has shipped data tooling before.",
        json.dumps({"github": "https://github.com/example"}, sort_keys=True),
        milestones,
        json.dumps({"trend": "constructive"}, sort_keys=True),
        json.dumps({"trust_summary": "clean history"}, sort_keys=True),
    )
    proposal = contract.get_proposal(proposal_id)
    assert proposal["status"] in ["PENDING_VOTE", "REJECTED_BY_AI"]


if __name__ == "__main__":
    test_grant_allocator()
