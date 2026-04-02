# {"Depends": "py-genlayer:test"}

from dataclasses import dataclass
import json
import re

from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"


def _parse_json_dict(raw: str) -> dict:
    if not raw:
        return {}
    try:
        first = raw.find("{")
        last = raw.rfind("}")
        if first == -1 or last == -1:
            return {}
        cleaned = re.sub(r",\s*([}\]])", r"\1", raw[first:last + 1])
        data = json.loads(cleaned)
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


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_msg = getattr(leaders_res, "message", "")
    try:
        leader_fn()
        return False
    except gl.vm.UserError as exc:
        return str(exc) == leader_msg
    except Exception:
        return False


@allow_storage
@dataclass
class Proposal:
    applicant: Address
    title: str
    description: str
    requested_amount: u256
    team_background: str
    milestones: str
    status: str
    ai_scores_json: str
    rationale: str
    for_votes: u256
    against_votes: u256
    abstain_votes: u256
    created_tick: u256
    vote_end_tick: u256
    executed: bool


class GrantAllocatorDAO(gl.Contract):
    owner: Address
    dao_mission: str
    score_threshold: u256
    quorum: u256
    voting_period: u256
    treasury_balance: u256
    proposal_nonce: u256
    tick: u256
    proposals: TreeMap[str, Proposal]
    proposal_order: DynArray[str]
    member_votes: TreeMap[str, str]
    disbursement_history: DynArray[str]

    def __init__(
        self,
        dao_mission: str,
        score_threshold: u256 = 65,
        quorum: u256 = 1,
        voting_period: u256 = 72,
        initial_treasury: u256 = 0,
    ):
        self.owner = gl.message.sender_address
        self.dao_mission = dao_mission[:3000]
        self.score_threshold = score_threshold
        self.quorum = quorum
        self.voting_period = voting_period
        self.treasury_balance = initial_treasury
        self.proposal_nonce = 0
        self.tick = 0

    def _next_tick(self) -> u256:
        self.tick += 1
        return self.tick

    def _proposal_key(self, proposal_id: str, member_address: Address) -> str:
        return proposal_id + ":" + member_address.as_hex

    @gl.public.write
    def submit_application(
        self,
        title: str,
        description: str,
        requested_amount: u256,
        team_background: str,
        milestones: str,
    ) -> str:
        proposal_id = "proposal-" + str(int(self.proposal_nonce))
        self.proposal_nonce += 1
        created_tick = self._next_tick()
        proposal = Proposal(
            applicant=gl.message.sender_address,
            title=title[:100],
            description=description[:2000],
            requested_amount=requested_amount,
            team_background=team_background[:1000],
            milestones=milestones[:1500],
            status="PENDING_EVALUATION",
            ai_scores_json="{}",
            rationale="",
            for_votes=0,
            against_votes=0,
            abstain_votes=0,
            created_tick=created_tick,
            vote_end_tick=created_tick + int(self.voting_period),
            executed=False,
        )
        self.proposals[proposal_id] = proposal
        self.proposal_order.append(proposal_id)
        return self._evaluate_proposal(proposal_id)

    def _evaluate_proposal(self, proposal_id: str) -> str:
        proposal = self.proposals[proposal_id]

        def leader_fn():
            prompt = f"""
Mission: {self.dao_mission}
Proposal title: {proposal.title}
Description: {proposal.description}
Team background: {proposal.team_background}
Milestones: {proposal.milestones}
Requested amount: {int(proposal.requested_amount)}

Return JSON only with:
{{
  "impact": 0-40,
  "feasibility": 0-35,
  "alignment": 0-25,
  "rationale": "short explanation"
}}
"""
            result = _parse_json_dict(gl.nondet.exec_prompt(prompt))
            try:
                impact = max(0, min(40, int(float(str(result.get("impact", 0)).strip()))))
                feasibility = max(0, min(35, int(float(str(result.get("feasibility", 0)).strip()))))
                alignment = max(0, min(25, int(float(str(result.get("alignment", 0)).strip()))))
            except Exception:
                raise gl.vm.UserError(f"{ERROR_LLM} invalid score field")
            rationale = str(result.get("rationale", "")).strip()[:1200]
            if not rationale:
                raise gl.vm.UserError(f"{ERROR_LLM} missing rationale")
            return {
                "impact": impact,
                "feasibility": feasibility,
                "alignment": alignment,
                "composite": impact + feasibility + alignment,
                "rationale": rationale,
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            leader = leaders_res.calldata
            validator = leader_fn()
            if abs(int(leader.get("composite", 0)) - int(validator.get("composite", 0))) > 20:
                return False
            return True

        scores = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        proposal.ai_scores_json = json.dumps(scores, sort_keys=True)
        proposal.rationale = str(scores.get("rationale", ""))[:1200]
        if int(scores.get("composite", 0)) >= int(self.score_threshold):
            proposal.status = "PENDING_VOTE"
        else:
            proposal.status = "REJECTED_BY_AI"
        self.proposals[proposal_id] = proposal
        return proposal_id

    @gl.public.write
    def cast_vote(self, proposal_id: str, vote: str) -> str:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.status != "PENDING_VOTE":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal not open for voting")
        self._next_tick()
        vote_key = self._proposal_key(proposal_id, gl.message.sender_address)
        if vote_key in self.member_votes:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Already voted")
        normalized = vote.strip().upper()
        if normalized not in ["FOR", "AGAINST", "ABSTAIN"]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Invalid vote")
        self.member_votes[vote_key] = normalized
        if normalized == "FOR":
            proposal.for_votes += 1
        elif normalized == "AGAINST":
            proposal.against_votes += 1
        else:
            proposal.abstain_votes += 1
        self.proposals[proposal_id] = proposal
        return "vote-recorded"

    @gl.public.write
    def fund_treasury(self, amount: u256) -> u256:
        self.treasury_balance += int(amount)
        self.disbursement_history.append(json.dumps({"type": "funding", "amount": int(amount)}, sort_keys=True))
        return self.treasury_balance

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
    def execute_proposal(self, proposal_id: str) -> str:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.status != "PENDING_VOTE":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal not in voting state")
        if proposal.executed:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal already executed")
        self._next_tick()
        total_votes = int(proposal.for_votes) + int(proposal.against_votes) + int(proposal.abstain_votes)
        if total_votes < int(self.quorum):
            proposal.status = "LAPSED"
            self.proposals[proposal_id] = proposal
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Quorum not met")
        if int(proposal.for_votes) <= int(proposal.against_votes):
            proposal.status = "REJECTED"
            self.proposals[proposal_id] = proposal
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Proposal did not pass")
        if int(self.treasury_balance) < int(proposal.requested_amount):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Insufficient treasury")
        self.treasury_balance -= int(proposal.requested_amount)
        proposal.status = "APPROVED"
        proposal.executed = True
        self.proposals[proposal_id] = proposal
        self.disbursement_history.append(
            json.dumps(
                {
                    "type": "disbursement",
                    "proposal_id": proposal_id,
                    "amount": int(proposal.requested_amount),
                    "recipient": proposal.applicant.as_hex,
                },
                sort_keys=True,
            )
        )
        return "proposal-executed"

    @gl.public.write
    def cancel_proposal(self, proposal_id: str) -> bool:
        if proposal_id not in self.proposals:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        proposal = self.proposals[proposal_id]
        if proposal.applicant != gl.message.sender_address:
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
        proposal = self.proposals[proposal_id]
        return {
            "proposal_id": proposal_id,
            "applicant": proposal.applicant.as_hex,
            "title": proposal.title,
            "description": proposal.description,
            "requested_amount": int(proposal.requested_amount),
            "team_background": proposal.team_background,
            "milestones": proposal.milestones,
            "status": proposal.status,
            "scores": _parse_json_dict(proposal.ai_scores_json),
            "rationale": proposal.rationale,
            "for_votes": int(proposal.for_votes),
            "against_votes": int(proposal.against_votes),
            "abstain_votes": int(proposal.abstain_votes),
            "executed": proposal.executed,
        }

    @gl.public.view
    def get_all_proposals(self, status_filter: str = "") -> list[dict]:
        items: list[dict] = []
        for proposal_id in self.proposal_order:
            proposal = self.proposals[proposal_id]
            if status_filter and proposal.status != status_filter:
                continue
            items.append(self.get_proposal(proposal_id))
        return items

    @gl.public.view
    def get_treasury_balance(self) -> u256:
        return self.treasury_balance

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
        return self.member_votes.get(self._proposal_key(proposal_id, Address(member_address)), "")

    @gl.public.view
    def get_my_proposals(self, wallet_address: str) -> list[dict]:
        wallet = Address(wallet_address)
        items: list[dict] = []
        for proposal_id in self.proposal_order:
            if self.proposals[proposal_id].applicant == wallet:
                items.append(self.get_proposal(proposal_id))
        return items

    @gl.public.view
    def get_disbursement_history(self) -> list[dict]:
        results: list[dict] = []
        for item in self.disbursement_history:
            results.append(_parse_json_dict(item))
        return results
