

A shared grant pool where anyone can submit a funding request for a project. The AI evaluates each application against the pool's stated mission (stored onchain), scores it on impact/feasibility/alignment, and recommends a funding amount. Human DAO members vote with the AI recommendation visible. Applications that score below a threshold are filtered out before humans even see them. Reduces governance fatigue dramatically — only quality proposals reach the vote.

current values but it can be updated 

dao_mission: To empower decentralised innovation by providing a transparent, community-driven platform for rating and funding high-impact projects through merit-based grant allocation.
score_threshold: 70/100
quorum: 20%
voting_period: (10,000 minutes)
initial_treasury: 1000000000


### Description

Grant Allocator DAO is a shared funding pool governed by AI-assisted human voting. Any wallet can submit a funding request for a project. An Intelligent Contract evaluates each application against the pool's stated mission (stored permanently on-chain), scoring it on three axes: **Impact** (does it move the mission forward?), **Feasibility** (can this team execute?), and **Alignment** (does it fit the funding criteria?). Applications below a minimum composite score are automatically filtered — they never surface to human voters. Qualified proposals are queued for DAO member voting, with the AI's recommendation and scoring rationale displayed alongside the vote buttons. This eliminates governance fatigue: DAO members only engage with quality proposals. The contract manages fund disbursement when a proposal passes the human vote.

**Core Problem Solved:** Most DAOs suffer from governance fatigue — token holders stop voting because the signal-to-noise ratio of proposals is too low. This contract inserts an AI pre-filter layer that acts as an always-on grants committee, dramatically improving proposal quality reaching human voters.

---

### How It Works

1. **DAO Setup** — A deployer initialises the contract with: pool mission statement, minimum AI score threshold (e.g. 65/100), quorum percentage, voting period duration, and initial treasury funding.
2. **Applicant Submits** — Any wallet calls `submit_application()` with project title, description, requested amount, team background, and milestone plan. Submission requires a small anti-spam stake (refunded if approved).
3. **AI Evaluation Triggers** — The Intelligent Contract's non-deterministic layer fetches the stored mission statement and evaluates the submission against it. It scores Impact (0–40), Feasibility (0–35), and Alignment (0–25), returning a composite score with written rationale.
4. **Threshold Gate** — If composite score < threshold, the application is marked `REJECTED_BY_AI` and the stake is forfeited. The rejection reason is stored on-chain and visible to the applicant.
5. **Qualified Queue** — Applications scoring above the threshold enter `PENDING_VOTE` status. DAO members are notified (via on-chain events).
6. **Human Vote** — DAO members (token holders) call `cast_vote()` with FOR/AGAINST/ABSTAIN. The AI score and rationale are displayed in the UI. Voting closes after the defined period.
7. **Execution** — If quorum is met and FOR > AGAINST, the contract automatically transfers the requested amount to the applicant's wallet. If quorum is not met, the proposal lapses.
8. **Treasury Management** — Token holders can `fund_treasury()` at any time. DAO members can adjust the AI score threshold via `update_threshold()` (requires vote).

---

### Frontend Architecture

| Route | Page Name | Purpose |
|---|---|---|
| `/` | Landing / DAO Overview | Mission statement, treasury balance, stats (proposals submitted / approved / total disbursed) |
| `/proposals` | Proposals Board | Filterable list: All / Pending Vote / Approved / Rejected. AI score badge on each card |
| `/proposals/[id]` | Proposal Detail | Full application text, AI scorecard (Impact / Feasibility / Alignment breakdown), vote tally, vote buttons, timeline |
| `/submit` | Submit Application | Multi-step form: Project Info → Team Background → Milestones → Budget → Review & Submit |
| `/submit/[id]/status` | Submission Status | Real-time AI evaluation progress, score reveal animation, outcome (pass/fail) |
| `/vote` | Active Votes | All proposals currently in voting window, sorted by time remaining |
| `/treasury` | Treasury Dashboard | Balance chart over time, disbursement history, fund pool button |
| `/admin` | DAO Admin | Update threshold, update mission, manage member allowlist (if permissioned) |
| `/my-proposals` | My Submissions | Applicant's own proposal history with statuses |

---


### Write Methods Table

| Method | Inputs | Character Limits | Returns | When to Call |
|---|---|---|---|---|
| `submit_application` | `title: str`, `description: str`, `requested_amount: int`, `team_background: str`, `milestones: str` | title: 100, description: 2000, team_background: 1000, milestones: 1500 | `proposal_id: str` | When applicant submits the final step of the form |
| `cast_vote` | `proposal_id: str`, `vote: str ('FOR'/'AGAINST'/'ABSTAIN')` | — | `tx_hash` | When DAO member clicks a vote button |
| `fund_treasury` | `amount: int` (in wei) | — | `new_balance: int` | When member clicks "Fund Pool" on Treasury page |
| `update_threshold` | `new_threshold: int` (0–100) | — | `success: bool` | Admin action after governance vote |
| `update_mission` | `new_mission: str` | 3000 chars | `success: bool` | Admin-only, updates evaluation baseline |
| `execute_proposal` | `proposal_id: str` | — | `tx_hash` | Called after voting closes and proposal passed |
| `cancel_proposal` | `proposal_id: str` | — | `success: bool` | Applicant cancels their own pending proposal |

---

### View Methods Table

| Method | Inputs | Output | When to Use |
|---|---|---|---|
| `get_proposal` | `proposal_id: str` | Full proposal object (status, scores, rationale, vote tallies) | Proposal detail page load |
| `get_all_proposals` | `status_filter: str (optional)` | List of proposal summaries | Proposals board page |
| `get_treasury_balance` | — | `balance: int` (wei) | Treasury dashboard |
| `get_dao_mission` | — | `mission: str` | Landing page, admin page |
| `get_score_threshold` | — | `threshold: int` | Admin page, submission form disclaimer |
| `get_voting_period` | — | `period_seconds: int` | Proposal detail countdown |
| `get_member_vote` | `proposal_id: str`, `member_address: str` | `vote: str` or `null` | Disable vote buttons if already voted |
| `get_my_proposals` | `wallet_address: str` | List of applicant's proposals | My Proposals page |
| `get_disbursement_history` | — | List of past disbursements | Treasury dashboard chart |

---

### Complete Frontend Flow Diagram

```
User visits /
      |
      v
[Landing: Mission + Stats + Treasury Balance]
      |
      +---[Applicant]---> /submit
      |                       |
      |              [Step 1: Project Info]
      |                       |
      |              [Step 2: Team Background]
      |                       |
      |              [Step 3: Milestones]
      |                       |
      |              [Step 4: Budget]
      |                       |
      |              [Review & Sign Tx]
      |                       |
      |              [/submit/[id]/status]
      |                       |
      |              [Polling: PENDING_EVALUATION]
      |                       |
      |               AI scores arrive
      |                  /         \
      |           Score >= threshold   Score < threshold
      |                  |                    |
      |         [Pass Animation +        [Rejection Screen
      |          rationale reveal]        + Revise CTA]
      |                  |
      |         Proposal enters PENDING_VOTE
      |
      +---[DAO Member]---> /vote
                              |
                    [Active Proposals List]
                              |
                    [Click Proposal] --> /proposals/[id]
                              |
                    [View AI Scorecard + Rationale]
                              |
                    [FOR / AGAINST / ABSTAIN buttons]
                              |
                    [Sign Tx] --> [Optimistic UI update]
                              |
                    [Voting closes after period]
                              |
                      Quorum met?
                       /        \
                     Yes          No
                      |            |
              [execute_proposal]  [Proposal Lapses]
                      |
              [Funds disbursed to applicant]
```

---

### How Users Use the Contract — Realistic User Journey

**Maya, an indie developer, wants a grant to build open-source dev tools.**

1. She visits the DAO landing page, reads the mission ("Fund open-source infrastructure for web3 developers"), and sees the treasury has 50,000 GEN tokens.
2. She navigates to `/submit` and fills in the four-step form. On the final step she reviews her application, sees a 0.1 GEN anti-spam stake requirement, and clicks "Submit & Sign."
3. Her wallet pops up. She signs. She's redirected to `/submit/abc123/status`.
4. A spinning indicator reads "AI is evaluating your proposal…" — she waits about 45 seconds.
5. Three score bars animate: Impact: 34/40 ✅, Feasibility: 28/35 ✅, Alignment: 20/25 ✅. Composite: 82/100. Threshold was 65.
6. Confetti. The AI rationale appears: "Strong technical plan, clear open-source ethos, well-aligned with mission. Team background demonstrates shipping history. Milestone plan is realistic."
7. Her proposal now appears in `/vote` for DAO members to see.
8. Over the next 72 hours, 12 DAO members vote. 9 FOR, 2 AGAINST, 1 ABSTAIN. Quorum met.
9. The contract auto-executes. 5,000 GEN is transferred to Maya's wallet.
10. She gets an on-chain event notification. Her `/my-proposals` page shows "APPROVED — Funded 5,000 GEN."




this is the contract address deployed on studionet: 0x70a86f37BD82c0DB38D6b3b7067bbC3085319F35
