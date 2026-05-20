import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export interface Milestone {
  milestone_id: string;
  title: string;
  description: string;
  expected_deliverables?: string;
  amount_usd_cents: number;
  status: string;
  evidence_uri?: string;
  evidence_note?: string;
  ai_review?: {
    completion_score: number;
    release_recommendation: boolean;
    summary: string;
    risk_flags: string[];
  };
  paid?: boolean;
  arc_tx_hash?: string;
}

export interface Proposal {
  proposal_id: string;
  applicant: string;
  title: string;
  description: string;
  requested_amount_usd_cents: number;
  team_background: string;
  team_links: Record<string, string>;
  milestones: Milestone[];
  market_context: Record<string, unknown>;
  due_diligence: Record<string, unknown>;
  status: string;
  ai_packet: {
    impact?: number;
    feasibility?: number;
    alignment?: number;
    market_sentiment?: number;
    narrative_fit?: number;
    trust_score?: number;
    composite?: number;
    recommended_amount_usd_cents?: number;
    rationale?: string;
    risk_flags?: string[];
  };
  committee_votes_for: number;
  committee_votes_against: number;
  committee_votes_abstain: number;
  executed: boolean;
  approved_amount_usd_cents: number;
  released_amount_usd_cents: number;
  arc_grant_id: string;
}

export interface TreasurySummary {
  treasury_balance_usd_cents: number;
  arc_treasury_address: string;
  usdc_token_address: string;
}

export interface Disbursement {
  type: string;
  proposal_id?: string;
  milestone_id?: string;
  amount_usd_cents?: number;
  approved_amount_usd_cents?: number;
  arc_grant_id?: string;
  arc_tx_hash?: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  [key: string]: unknown;
}

class GrantAllocatorContract {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;
    const config: { chain: typeof studionet; account?: `0x${string}` } = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    this.client = createClient(config);
  }

  private parseResult<T>(raw: unknown): T {
    if (raw instanceof Map) {
      const obj: Record<string, unknown> = {};
      raw.forEach((value, key) => {
        obj[String(key)] = this.parseResult(value);
      });
      return obj as T;
    }
    if (Array.isArray(raw)) {
      return raw.map((value) => this.parseResult(value)) as T;
    }
    return raw as T;
  }

  private waitForAccepted(hash: `0x${string}`) {
    return this.client.waitForTransactionReceipt({
      hash,
      status: "ACCEPTED" as never,
      retries: 60,
      interval: 5000,
    }) as Promise<TransactionReceipt>;
  }

  async getProposal(proposalId: string): Promise<Proposal> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_proposal",
      args: [proposalId],
    });
    return this.parseResult<Proposal>(raw);
  }

  async getAllProposals(statusFilter = ""): Promise<Proposal[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_all_proposals",
      args: [statusFilter],
    });
    return this.parseResult<Proposal[]>(raw);
  }

  async getPassedScreeningProposals(): Promise<Proposal[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_passed_screening_proposals",
      args: [],
    });
    return this.parseResult<Proposal[]>(raw);
  }

  async getTreasuryBalance(): Promise<number> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_treasury_balance",
      args: [],
    });
    return Number(raw || 0);
  }

  async getTreasurySummary(): Promise<TreasurySummary> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_treasury_summary",
      args: [],
    });
    return this.parseResult<TreasurySummary>(raw);
  }

  async getDaoMission(): Promise<string> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_dao_mission",
      args: [],
    });
    return String(raw || "");
  }

  async getScoreThreshold(): Promise<number> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_score_threshold",
      args: [],
    });
    return Number(raw || 0);
  }

  async getVotingPeriod(): Promise<number> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_voting_period",
      args: [],
    });
    return Number(raw || 0);
  }

  async getMemberVote(proposalId: string, memberAddress: string): Promise<string> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_member_vote",
      args: [proposalId, memberAddress],
    });
    return String(raw || "");
  }

  async getMyProposals(walletAddress: string): Promise<Proposal[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_my_proposals",
      args: [walletAddress],
    });
    return this.parseResult<Proposal[]>(raw);
  }

  async getDisbursementHistory(): Promise<Disbursement[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_disbursement_history",
      args: [],
    });
    return this.parseResult<Disbursement[]>(raw);
  }

  async getCommitteeMembers(): Promise<string[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_committee_members",
      args: [],
    });
    return this.parseResult<string[]>(raw);
  }

  async submitApplication(input: {
    title: string;
    description: string;
    requestedAmountUsdCents: number;
    teamBackground: string;
    teamLinksJson: string;
    milestonesJson: string;
    marketContextJson: string;
    dueDiligenceJson: string;
  }) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_application",
      args: [
        input.title,
        input.description,
        input.requestedAmountUsdCents,
        input.teamBackground,
        input.teamLinksJson,
        input.milestonesJson,
        input.marketContextJson,
        input.dueDiligenceJson,
      ],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async castVote(proposalId: string, vote: "FOR" | "AGAINST" | "ABSTAIN") {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "cast_vote",
      args: [proposalId, vote],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async executeProposal(proposalId: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "execute_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async submitMilestoneEvidence(proposalId: string, milestoneId: string, evidenceUri: string, note: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_milestone_evidence",
      args: [proposalId, milestoneId, evidenceUri, note],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async reviewMilestone(proposalId: string, milestoneId: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "review_milestone",
      args: [proposalId, milestoneId],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async releaseTranche(proposalId: string, milestoneId: string, arcTxHash: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "release_tranche",
      args: [proposalId, milestoneId, arcTxHash],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async fundTreasury(amountUsdCents: number) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "fund_treasury",
      args: [amountUsdCents],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async updateThreshold(newThreshold: number) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_threshold",
      args: [newThreshold],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async updateMission(newMission: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_mission",
      args: [newMission],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async cancelProposal(proposalId: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "cancel_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async setCommitteeMember(memberAddress: string, allowed: boolean) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "set_committee_member",
      args: [memberAddress, allowed],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }

  async configureArcTreasury(arcTreasuryAddress: string, usdcTokenAddress: string) {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "configure_arc_treasury",
      args: [arcTreasuryAddress, usdcTokenAddress],
      value: BigInt(0),
    });
    return this.waitForAccepted(txHash);
  }
}

export default GrantAllocatorContract;
