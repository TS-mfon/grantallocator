# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json

from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"


def _json_load(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def _json_dump(data) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def _address_text(value) -> str:
    if isinstance(value, Address):
        return value.as_hex
    if isinstance(value, int):
        return "0x" + format(value, "040x")
    text = str(value).strip()
    if text.startswith("addr#") and len(text) == 45:
        return "0x" + text[5:]
    return text


def _vote_key(proposal_id: str, member_address: str) -> str:
    return proposal_id + ":" + _address_text(member_address)


def _clamp_int(value, low: int, high: int) -> int:
    try:
        parsed = int(float(str(value).strip()))
    except Exception:
        parsed = low
    return max(low, min(high, parsed))


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
    proposals: TreeMap[str, str]
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
        self.arc_treasury_address = _address_text(arc_treasury_address)[:80]
        self.usdc_token_address = _address_text(usdc_token_address)[:80]
        self.proposal_nonce = 0
        self.tick = 0

    def _only_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.UserError(f"{ERROR_EXPECTED} Only owner")

    def _next_tick(self) -> int:
        self.tick += 1
        return int(self.tick)

    def _is_committee_or_owner(self, member_address: str) -> bool:
        member = _address_text(member_address)
        if member == self.owner.as_hex:
            return True
        return bool(self.committee_members.get(member, False))

    def _get_proposal(self, proposal_id: str) -> dict:
        if proposal_id not in self.proposals:
            return {}
        return _json_load(self.proposals[proposal_id], {})

    def _save_proposal(self, proposal_id: str, proposal: dict) -> None:
        self.proposals[proposal_id] = _json_dump(proposal)

    def _normalize_milestones(self, raw: str) -> list:
        data = _json_load(raw, [])
        if not isinstance(data, list):
            return []
        normalized = []
        for index, item in enumerate(data):
            milestone = item if isinstance(item, dict) else {}
            amount = _clamp_int(milestone.get("amount_usd_cents", 0), 0, 10_000_000_000)
            normalized.append(
                {
                    "milestone_id": str(milestone.get("milestone_id", "ms-" + str(index + 1)))[:80],
                    "title": str(milestone.get("title", "Milestone " + str(index + 1)))[:160],
                    "description": str(milestone.get("description", ""))[:1000],
                    "expected_deliverables": str(milestone.get("expected_deliverables", ""))[:1000],
                    "amount_usd_cents": amount,
                    "status": str(milestone.get("status", "PLANNED"))[:80],
                    "paid": bool(milestone.get("paid", False)),
                }
            )
        return normalized

    def _packet_from_scores(self, requested_amount: int, impact: int, feasibility: int, alignment: int, market: int, narrative: int, trust: int, rationale: str, flags) -> dict:
        composite = impact + feasibility + alignment + market + narrative + trust
        return {
            "impact": impact,
            "feasibility": feasibility,
            "alignment": alignment,
            "market_sentiment": market,
            "narrative_fit": narrative,
            "trust_score": trust,
            "composite": composite,
            "recommended_amount_usd_cents": min(max(0, requested_amount), requested_amount),
            "rationale": rationale[:1500],
            "risk_flags": flags if isinstance(flags, list) else [],
        }

    def _create_application(
        self,
        applicant: str,
        title: str,
        description: str,
        requested_amount_usd_cents: int,
        team_background: str,
        team_links_json: str,
        milestones_json: str,
        market_context_json: str,
        due_diligence_json: str,
        status: str,
        ai_packet: dict,
        votes_for: int,
        votes_against: int,
        votes_abstain: int,
        executed: bool,
        approved_amount: int,
        released_amount: int,
        arc_grant_id: str,
    ) -> str:
        proposal_id = "proposal-" + str(int(self.proposal_nonce))
        self.proposal_nonce += 1
        created_tick = self._next_tick()
        requested = max(0, int(requested_amount_usd_cents))
        proposal = {
            "proposal_id": proposal_id,
            "applicant": _address_text(applicant),
            "title": title[:120],
            "description": description[:2500],
            "requested_amount_usd_cents": requested,
            "team_background": team_background[:1200],
            "team_links": _json_load(team_links_json, {}),
            "milestones": self._normalize_milestones(milestones_json),
            "market_context": _json_load(market_context_json, {}),
            "due_diligence": _json_load(due_diligence_json, {}),
            "status": status[:80],
            "ai_packet": ai_packet,
            "committee_votes_for": int(votes_for),
            "committee_votes_against": int(votes_against),
            "committee_votes_abstain": int(votes_abstain),
            "created_tick": created_tick,
            "vote_end_tick": created_tick + int(self.voting_period),
            "executed": bool(executed),
            "approved_amount_usd_cents": max(0, int(approved_amount)),
            "released_amount_usd_cents": max(0, int(released_amount)),
            "arc_grant_id": arc_grant_id[:120],
        }
        self.proposals[proposal_id] = _json_dump(proposal)
        self.proposal_order.append(proposal_id)
        return proposal_id

    def _evaluate_proposal(self, proposal: dict) -> dict:
        def leader_fn():
            prompt = f"""
Mission: {self.dao_mission}

Application:
Title: {proposal.get("title", "")}
Description: {proposal.get("description", "")}
Requested USD Cents: {proposal.get("requested_amount_usd_cents", 0)}
Team Background: {proposal.get("team_background", "")}
Team Links JSON: {_json_dump(proposal.get("team_links", {}))}
Milestones JSON: {_json_dump(proposal.get("milestones", []))}
Market Context JSON: {_json_dump(proposal.get("market_context", {}))}
Due Diligence JSON: {_json_dump(proposal.get("due_diligence", {}))}

Return JSON only:
{{
  "impact": 0-25,
  "feasibility": 0-20,
  "alignment": 0-20,
  "market_sentiment": 0-10,
  "narrative_fit": 0-10,
  "trust_score": 0-15,
  "recommended_amount_usd_cents": 0,
  "rationale": "short explanation",
  "risk_flags": ["flag"]
}}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} Non-dict response")
            rationale = str(result.get("rationale", "")).strip()
            if not rationale:
                raise gl.vm.UserError(f"{ERROR_LLM} missing rationale")
            flags = result.get("risk_flags", [])
            if not isinstance(flags, list):
                flags = []
            return self._packet_from_scores(
                int(proposal.get("requested_amount_usd_cents", 0)),
                _clamp_int(result.get("impact", 0), 0, 25),
                _clamp_int(result.get("feasibility", 0), 0, 20),
                _clamp_int(result.get("alignment", 0), 0, 20),
                _clamp_int(result.get("market_sentiment", 0), 0, 10),
                _clamp_int(result.get("narrative_fit", 0), 0, 10),
                _clamp_int(result.get("trust_score", 0), 0, 15),
                rationale,
                [str(flag)[:160] for flag in flags[:6]],
            )

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            leader = leaders_res.calldata
            validator = leader_fn()
            return abs(int(leader.get("composite", 0)) - int(validator.get("composite", 0))) <= 20

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _review_milestone(self, proposal: dict, milestone: dict) -> dict:
        def leader_fn():
            prompt = f"""
Grant Mission: {self.dao_mission}
Proposal Title: {proposal.get("title", "")}
Milestone JSON: {_json_dump(milestone)}
Due Diligence JSON: {_json_dump(proposal.get("due_diligence", {}))}
Market Context JSON: {_json_dump(proposal.get("market_context", {}))}

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
            summary = str(result.get("summary", "")).strip()
            if not summary:
                raise gl.vm.UserError(f"{ERROR_LLM} missing summary")
            flags = result.get("risk_flags", [])
            if not isinstance(flags, list):
                flags = []
            score = _clamp_int(result.get("completion_score", 0), 0, 100)
            return {
                "completion_score": score,
                "release_recommendation": bool(result.get("release_recommendation", score >= 70)),
                "summary": summary[:1000],
                "risk_flags": [str(flag)[:160] for flag in flags[:5]],
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
        self._only_owner()
        member_key = _address_text(member_address)
        if member_key not in self.committee_members:
            self.committee_member_order.append(member_key)
        self.committee_members[member_key] = bool(allowed)
        return True

    @gl.public.write
    def configure_arc_treasury(self, arc_treasury_address: str, usdc_token_address: str) -> bool:
        self._only_owner()
        self.arc_treasury_address = _address_text(arc_treasury_address)[:80]
        self.usdc_token_address = _address_text(usdc_token_address)[:80]
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
        proposal_id = self._create_application(
            gl.message.sender_address.as_hex,
            title,
            description,
            int(requested_amount_usd_cents),
            team_background,
            team_links_json,
            milestones_json,
            market_context_json,
            due_diligence_json,
            "PENDING_EVALUATION",
            {},
            0,
            0,
            0,
            False,
            0,
            0,
            "",
        )
        proposal = self._get_proposal(proposal_id)
        ai_packet = self._evaluate_proposal(proposal)
        proposal["ai_packet"] = ai_packet
        proposal["approved_amount_usd_cents"] = int(ai_packet.get("recommended_amount_usd_cents", 0))
        proposal["status"] = "PENDING_VOTE" if int(ai_packet.get("composite", 0)) >= int(self.score_threshold) else "REJECTED_BY_AI"
        self._save_proposal(proposal_id, proposal)
        return proposal_id

    @gl.public.write
    def seed_application(
        self,
        title: str,
        description: str,
        requested_amount_usd_cents: u256,
        team_background: str,
        team_links_json: str,
        milestones_json: str,
        market_context_json: str,
        due_diligence_json: str,
        status: str,
        ai_packet_json: str,
        votes_for: u256,
        votes_against: u256,
        votes_abstain: u256,
        executed: bool,
        released_amount_usd_cents: u256,
    ) -> str:
        self._only_owner()
        requested = int(requested_amount_usd_cents)
        ai_packet = _json_load(ai_packet_json, {})
        if not isinstance(ai_packet, dict) or not ai_packet:
            ai_packet = self._packet_from_scores(
                requested,
                20,
                16,
                17,
                7,
                8,
                12,
                "Seeded AI packet for UI and contract testing.",
                [],
            )
        approved = int(ai_packet.get("recommended_amount_usd_cents", requested))
        return self._create_application(
            self.owner.as_hex,
            title,
            description,
            requested,
            team_background,
            team_links_json,
            milestones_json,
            market_context_json,
            due_diligence_json,
            status,
            ai_packet,
            int(votes_for),
            int(votes_against),
            int(votes_abstain),
            bool(executed),
            approved,
            int(released_amount_usd_cents),
            "arc-grant-seed-" + str(int(self.proposal_nonce)),
        )

    @gl.public.write
    def seed_demo_applications(self, count: u256) -> int:
        self._only_owner()
        total = min(max(0, int(count)), 60)
        for index in range(total):
            requested = 2500000 + (index * 175000)
            if index < 8:
                status = "PENDING_VOTE"
                executed = False
                released = 0
            elif index < 14:
                status = "APPROVED"
                executed = True
                released = 0
            elif index < 19:
                status = "ACTIVE_MILESTONES"
                executed = True
                released = requested // 3
            elif index < 24:
                status = "READY_FOR_RELEASE"
                executed = True
                released = requested // 2
            elif index < 27:
                status = "COMPLETED"
                executed = True
                released = requested
            else:
                status = "REJECTED_BY_AI"
                executed = False
                released = 0

            milestones = _json_dump(
                [
                    {
                        "milestone_id": "ms-1",
                        "title": "Prototype and public demo",
                        "description": "Ship a working prototype and publish a technical walkthrough.",
                        "expected_deliverables": "Demo URL, repo, and deployment notes.",
                        "amount_usd_cents": requested // 3,
                        "status": "PAID" if released > 0 else "PLANNED",
                        "paid": released > 0,
                    },
                    {
                        "milestone_id": "ms-2",
                        "title": "Security and growth checkpoint",
                        "description": "Complete audit fixes, user testing, and adoption report.",
                        "expected_deliverables": "Audit notes, usage dashboard, and milestone evidence.",
                        "amount_usd_cents": requested // 3,
                        "status": "UNDER_REVIEW" if status == "READY_FOR_RELEASE" else "PLANNED",
                        "paid": False,
                    },
                    {
                        "milestone_id": "ms-3",
                        "title": "Mainnet-ready handoff",
                        "description": "Finalize operations, docs, and treasury reporting.",
                        "expected_deliverables": "Runbook, KPI report, and final release evidence.",
                        "amount_usd_cents": requested - ((requested // 3) * 2),
                        "status": "PAID" if status == "COMPLETED" else "PLANNED",
                        "paid": status == "COMPLETED",
                    },
                ]
            )
            market = _json_dump(
                {
                    "source": "CryptoRank.io",
                    "trend": "AI x DeFi infrastructure",
                    "sentiment": "bullish" if index % 3 != 0 else "neutral",
                    "narrative_strength": 80 - (index % 7),
                }
            )
            due_diligence = _json_dump(
                {
                    "team_check": "clean",
                    "identity_notes": "Seeded background check found no critical red flags.",
                    "trust_score": 76 + (index % 14),
                }
            )
            ai_packet = _json_dump(
                self._packet_from_scores(
                    requested,
                    18 + (index % 7),
                    14 + (index % 6),
                    15 + (index % 5),
                    6 + (index % 4),
                    7 + (index % 3),
                    11 + (index % 5),
                    "Seeded AI evaluation with market sentiment, narrative fit, and team background checks.",
                    [] if status != "REJECTED_BY_AI" else ["Trust score below threshold", "Insufficient milestone specificity"],
                )
            )
            self.seed_application(
                "Grant Application " + str(index + 1),
                "Seeded grant for testing AI screening, committee voting, USD pool accounting, and milestone-gated disbursement.",
                requested,
                "Experienced builders with public repositories, prior grants, and clean diligence profile.",
                _json_dump({"github": "https://github.com/example/team-" + str(index + 1), "website": "https://example.org/grant-" + str(index + 1)}),
                milestones,
                market,
                due_diligence,
                status,
                ai_packet,
                3 + (index % 8),
                index % 3,
                index % 2,
                executed,
                released,
            )
        return int(self.proposal_nonce)

    @gl.public.write
    def seed_ai_packet(self, proposal_id: str, ai_packet_json: str, status: str) -> bool:
        self._only_owner()
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        packet = _json_load(ai_packet_json, {})
        if not isinstance(packet, dict):
            raise gl.UserError(f"{ERROR_EXPECTED} Invalid packet")
        proposal["ai_packet"] = packet
        proposal["approved_amount_usd_cents"] = int(packet.get("recommended_amount_usd_cents", 0))
        proposal["status"] = status[:80]
        self._save_proposal(proposal_id, proposal)
        return True

    @gl.public.write
    def seed_milestone_state(self, proposal_id: str, milestone_id: str, status: str, completion_score: u256, paid: bool, arc_tx_hash: str) -> bool:
        self._only_owner()
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        milestones = proposal.get("milestones", [])
        updated = []
        found = False
        for milestone in milestones:
            item = milestone if isinstance(milestone, dict) else {}
            if str(item.get("milestone_id", "")) == milestone_id:
                item["status"] = status[:80]
                item["paid"] = bool(paid)
                item["arc_tx_hash"] = arc_tx_hash[:160]
                item["ai_review"] = {
                    "completion_score": int(completion_score),
                    "release_recommendation": int(completion_score) >= 70,
                    "summary": "Seeded milestone review for UI testing.",
                    "risk_flags": [],
                }
                found = True
            updated.append(item)
        if not found:
            raise gl.UserError(f"{ERROR_EXPECTED} Milestone not found")
        proposal["milestones"] = updated
        self._save_proposal(proposal_id, proposal)
        return True

    @gl.public.write
    def cast_vote(self, proposal_id: str, vote: str) -> str:
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        if proposal.get("status") != "PENDING_VOTE":
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal not open for voting")
        if not self._is_committee_or_owner(gl.message.sender_address.as_hex):
            raise gl.UserError(f"{ERROR_EXPECTED} Not committee")
        vote_key = _vote_key(proposal_id, gl.message.sender_address.as_hex)
        if vote_key in self.member_votes:
            raise gl.UserError(f"{ERROR_EXPECTED} Already voted")
        normalized = vote.strip().upper()
        if normalized not in ["FOR", "AGAINST", "ABSTAIN"]:
            raise gl.UserError(f"{ERROR_EXPECTED} Invalid vote")
        self.member_votes[vote_key] = normalized
        field = "committee_votes_abstain"
        if normalized == "FOR":
            field = "committee_votes_for"
        elif normalized == "AGAINST":
            field = "committee_votes_against"
        proposal[field] = int(proposal.get(field, 0)) + 1
        self._save_proposal(proposal_id, proposal)
        return "vote-recorded"

    @gl.public.write
    def execute_proposal(self, proposal_id: str) -> str:
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        if proposal.get("status") != "PENDING_VOTE":
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal not in voting state")
        if proposal.get("executed", False):
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal already executed")
        total_votes = int(proposal.get("committee_votes_for", 0)) + int(proposal.get("committee_votes_against", 0)) + int(proposal.get("committee_votes_abstain", 0))
        if total_votes < int(self.quorum):
            proposal["status"] = "LAPSED"
            self._save_proposal(proposal_id, proposal)
            raise gl.UserError(f"{ERROR_EXPECTED} Quorum not met")
        if int(proposal.get("committee_votes_for", 0)) <= int(proposal.get("committee_votes_against", 0)):
            proposal["status"] = "REJECTED"
            self._save_proposal(proposal_id, proposal)
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal did not pass")
        if int(self.treasury_balance_usd_cents) < int(proposal.get("approved_amount_usd_cents", 0)):
            raise gl.UserError(f"{ERROR_EXPECTED} Insufficient treasury")
        proposal["status"] = "APPROVED"
        proposal["executed"] = True
        proposal["arc_grant_id"] = "arc-grant-" + proposal_id
        self._save_proposal(proposal_id, proposal)
        self.disbursement_history.append(
            _json_dump(
                {
                    "type": "grant_approved",
                    "proposal_id": proposal_id,
                    "approved_amount_usd_cents": int(proposal.get("approved_amount_usd_cents", 0)),
                    "arc_grant_id": proposal.get("arc_grant_id", ""),
                }
            )
        )
        return "proposal-approved"

    @gl.public.write
    def submit_milestone_evidence(self, proposal_id: str, milestone_id: str, evidence_uri: str, note: str) -> bool:
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        if proposal.get("applicant") != gl.message.sender_address.as_hex:
            raise gl.UserError(f"{ERROR_EXPECTED} Only applicant")
        milestones = proposal.get("milestones", [])
        updated = []
        found = False
        for milestone in milestones:
            item = milestone if isinstance(milestone, dict) else {}
            if str(item.get("milestone_id", "")) == milestone_id:
                item["evidence_uri"] = evidence_uri[:500]
                item["evidence_note"] = note[:500]
                item["status"] = "EVIDENCE_SUBMITTED"
                found = True
            updated.append(item)
        if not found:
            raise gl.UserError(f"{ERROR_EXPECTED} Milestone not found")
        proposal["milestones"] = updated
        proposal["status"] = "MILESTONE_REVIEW"
        self._save_proposal(proposal_id, proposal)
        return True

    @gl.public.write
    def review_milestone(self, proposal_id: str, milestone_id: str) -> dict:
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        target = {}
        for milestone in proposal.get("milestones", []):
            item = milestone if isinstance(milestone, dict) else {}
            if str(item.get("milestone_id", "")) == milestone_id:
                target = item
        if not target:
            raise gl.UserError(f"{ERROR_EXPECTED} Milestone not found")
        result = self._review_milestone(proposal, target)
        updated = []
        for milestone in proposal.get("milestones", []):
            item = milestone if isinstance(milestone, dict) else {}
            if str(item.get("milestone_id", "")) == milestone_id:
                item["ai_review"] = result
                item["status"] = "READY_FOR_RELEASE" if result.get("release_recommendation", False) else "REVISION_REQUESTED"
            updated.append(item)
        proposal["milestones"] = updated
        proposal["status"] = "READY_FOR_RELEASE" if result.get("release_recommendation", False) else "REVISION_REQUESTED"
        self._save_proposal(proposal_id, proposal)
        return result

    @gl.public.write
    def release_tranche(self, proposal_id: str, milestone_id: str, arc_tx_hash: str) -> bool:
        self._only_owner()
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        if proposal.get("status") not in ["READY_FOR_RELEASE", "ACTIVE_MILESTONES", "APPROVED"]:
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal not ready for release")
        updated = []
        release_amount = 0
        found = False
        all_paid = True
        for milestone in proposal.get("milestones", []):
            item = milestone if isinstance(milestone, dict) else {}
            if str(item.get("milestone_id", "")) == milestone_id:
                if item.get("status") != "READY_FOR_RELEASE":
                    raise gl.UserError(f"{ERROR_EXPECTED} Milestone not ready")
                if item.get("paid", False):
                    raise gl.UserError(f"{ERROR_EXPECTED} Milestone already paid")
                release_amount = int(item.get("amount_usd_cents", 0))
                item["paid"] = True
                item["arc_tx_hash"] = arc_tx_hash[:160]
                item["status"] = "PAID"
                found = True
            if item.get("status") != "PAID":
                all_paid = False
            updated.append(item)
        if not found:
            raise gl.UserError(f"{ERROR_EXPECTED} Milestone not found")
        if int(self.treasury_balance_usd_cents) < release_amount:
            raise gl.UserError(f"{ERROR_EXPECTED} Insufficient treasury")
        self.treasury_balance_usd_cents -= release_amount
        proposal["released_amount_usd_cents"] = int(proposal.get("released_amount_usd_cents", 0)) + release_amount
        proposal["milestones"] = updated
        proposal["status"] = "COMPLETED" if all_paid else "ACTIVE_MILESTONES"
        self._save_proposal(proposal_id, proposal)
        self.disbursement_history.append(
            _json_dump(
                {
                    "type": "tranche_release",
                    "proposal_id": proposal_id,
                    "milestone_id": milestone_id,
                    "amount_usd_cents": release_amount,
                    "arc_tx_hash": arc_tx_hash[:160],
                }
            )
        )
        return True

    @gl.public.write
    def fund_treasury(self, amount_usd_cents: u256) -> u256:
        self.treasury_balance_usd_cents += int(amount_usd_cents)
        self.disbursement_history.append(_json_dump({"type": "funding", "amount_usd_cents": int(amount_usd_cents)}))
        return self.treasury_balance_usd_cents

    @gl.public.write
    def update_threshold(self, new_threshold: u256) -> bool:
        self._only_owner()
        self.score_threshold = max(0, min(100, int(new_threshold)))
        return True

    @gl.public.write
    def update_mission(self, new_mission: str) -> bool:
        self._only_owner()
        self.dao_mission = new_mission[:3000]
        return True

    @gl.public.write
    def cancel_proposal(self, proposal_id: str) -> bool:
        proposal = self._get_proposal(proposal_id)
        if not proposal:
            raise gl.UserError(f"{ERROR_EXPECTED} Unknown proposal")
        if proposal.get("applicant") != gl.message.sender_address.as_hex:
            raise gl.UserError(f"{ERROR_EXPECTED} Only applicant")
        if proposal.get("status") not in ["PENDING_EVALUATION", "PENDING_VOTE"]:
            raise gl.UserError(f"{ERROR_EXPECTED} Proposal cannot be cancelled")
        proposal["status"] = "CANCELLED"
        self._save_proposal(proposal_id, proposal)
        return True

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> dict:
        return self._get_proposal(proposal_id)

    @gl.public.view
    def get_application_count(self) -> int:
        return int(self.proposal_nonce)

    @gl.public.view
    def get_all_proposals(self, status_filter: str = "") -> list:
        items = []
        for proposal_id in self.proposal_order:
            proposal = self._get_proposal(proposal_id)
            if not status_filter or proposal.get("status") == status_filter:
                items.append(proposal)
        return items

    @gl.public.view
    def get_applications_page(self, offset: u256, limit: u256, status_filter: str = "") -> list:
        items = []
        start = int(offset)
        end = start + int(limit)
        index = 0
        for proposal_id in self.proposal_order:
            if index >= start and index < end:
                proposal = self._get_proposal(proposal_id)
                if not status_filter or proposal.get("status") == status_filter:
                    items.append(proposal)
            index += 1
        return items

    @gl.public.view
    def get_passed_screening_proposals(self) -> list:
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
        return self.member_votes.get(_vote_key(proposal_id, member_address), "")

    @gl.public.view
    def get_my_proposals(self, wallet_address: str) -> list:
        items = []
        wallet = _address_text(wallet_address)
        for proposal_id in self.proposal_order:
            proposal = self._get_proposal(proposal_id)
            if proposal.get("applicant") == wallet:
                items.append(proposal)
        return items

    @gl.public.view
    def get_disbursement_history(self) -> list:
        results = []
        for item in self.disbursement_history:
            results.append(_json_load(item, {}))
        return results

    @gl.public.view
    def get_committee_members(self) -> list:
        items = []
        for member_address in self.committee_member_order:
            if self.committee_members.get(member_address, False):
                items.append(member_address)
        return items
