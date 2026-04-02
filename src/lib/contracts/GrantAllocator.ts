import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export interface Proposal {
  proposal_id: string;
  applicant: string;
  title: string;
  description: string;
  requested_amount: number;
  team_background: string;
  milestones: string;
  status: string;
  scores: { impact?: number; feasibility?: number; alignment?: number; composite?: number; rationale?: string };
  rationale: string;
  for_votes: number;
  against_votes: number;
  abstain_votes: number;
  executed: boolean;
}

export interface Disbursement {
  type: string;
  amount?: number;
  proposal_id?: string;
  recipient?: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  [key: string]: any;
}

class GrantAllocatorContract {
  private contractAddress: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;
    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    this.client = createClient(config);
  }

  private parseResult(raw: any): any {
    if (raw instanceof Map) {
      const obj: Record<string, any> = {};
      raw.forEach((v: any, k: any) => { obj[k] = this.parseResult(v); });
      return obj;
    }
    if (Array.isArray(raw)) return raw.map(i => this.parseResult(i));
    return raw;
  }

  async getProposal(proposalId: string): Promise<Proposal> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_proposal",
      args: [proposalId],
    });
    return this.parseResult(raw) as Proposal;
  }

  async getAllProposals(statusFilter = ""): Promise<Proposal[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_all_proposals",
      args: [statusFilter],
    });
    const parsed = this.parseResult(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  async getTreasuryBalance(): Promise<number> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_treasury_balance",
      args: [],
    });
    return Number(raw) || 0;
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
    return Number(raw) || 0;
  }

  async getVotingPeriod(): Promise<number> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_voting_period",
      args: [],
    });
    return Number(raw) || 0;
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
    const parsed = this.parseResult(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  async getDisbursementHistory(): Promise<Disbursement[]> {
    const raw = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_disbursement_history",
      args: [],
    });
    const parsed = this.parseResult(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  // Write methods
  async submitApplication(
    title: string, description: string, requestedAmount: number,
    teamBackground: string, milestones: string
  ): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "submit_application",
      args: [title, description, requestedAmount, teamBackground, milestones],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 60, interval: 5000,
    }) as TransactionReceipt;
  }

  async castVote(proposalId: string, vote: "FOR" | "AGAINST" | "ABSTAIN"): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "cast_vote",
      args: [proposalId, vote],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }

  async fundTreasury(amount: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "fund_treasury",
      args: [amount],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }

  async updateThreshold(newThreshold: number): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_threshold",
      args: [newThreshold],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }

  async updateMission(newMission: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "update_mission",
      args: [newMission],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }

  async executeProposal(proposalId: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "execute_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }

  async cancelProposal(proposalId: string): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName: "cancel_proposal",
      args: [proposalId],
      value: BigInt(0),
    });
    return await this.client.waitForTransactionReceipt({
      hash: txHash, status: "ACCEPTED" as any, retries: 24, interval: 5000,
    }) as TransactionReceipt;
  }
}

export default GrantAllocatorContract;
