import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { CONTRACT_ADDRESS } from "@/lib/genlayer/client";
import GrantAllocatorContract, { type Proposal } from "@/lib/contracts/GrantAllocator";

function useContract() {
  const { address } = useWallet();
  return useMemo(() => new GrantAllocatorContract(CONTRACT_ADDRESS, address), [address]);
}

export function useAllProposals(statusFilter = "") {
  const contract = useContract();
  return useQuery({
    queryKey: ["proposals", statusFilter],
    queryFn: () => contract.getAllProposals(statusFilter),
    staleTime: 5000,
  });
}

export function usePassedScreeningProposals() {
  const contract = useContract();
  return useQuery({
    queryKey: ["passed-screening-proposals"],
    queryFn: () => contract.getPassedScreeningProposals(),
    staleTime: 5000,
  });
}

export function useProposal(proposalId: string) {
  const contract = useContract();
  return useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => contract.getProposal(proposalId),
    enabled: !!proposalId,
    refetchInterval: (query) => {
      const data = query.state.data as Proposal | undefined;
      return data && ["PENDING_EVALUATION", "PENDING_VOTE", "MILESTONE_REVIEW", "READY_FOR_RELEASE"].includes(data.status)
        ? 4000
        : false;
    },
  });
}

export function useTreasuryBalance() {
  const contract = useContract();
  return useQuery({
    queryKey: ["treasury-balance"],
    queryFn: () => contract.getTreasuryBalance(),
    staleTime: 10000,
  });
}

export function useTreasurySummary() {
  const contract = useContract();
  return useQuery({
    queryKey: ["treasury-summary"],
    queryFn: () => contract.getTreasurySummary(),
    staleTime: 10000,
  });
}

export function useDaoMission() {
  const contract = useContract();
  return useQuery({
    queryKey: ["dao-mission"],
    queryFn: () => contract.getDaoMission(),
    staleTime: 60000,
  });
}

export function useScoreThreshold() {
  const contract = useContract();
  return useQuery({
    queryKey: ["score-threshold"],
    queryFn: () => contract.getScoreThreshold(),
    staleTime: 60000,
  });
}

export function useVotingPeriod() {
  const contract = useContract();
  return useQuery({
    queryKey: ["voting-period"],
    queryFn: () => contract.getVotingPeriod(),
    staleTime: 60000,
  });
}

export function useMemberVote(proposalId: string) {
  const contract = useContract();
  const { address } = useWallet();
  return useQuery({
    queryKey: ["member-vote", proposalId, address],
    queryFn: () => contract.getMemberVote(proposalId, address!),
    enabled: !!proposalId && !!address,
  });
}

export function useMyProposals() {
  const contract = useContract();
  const { address } = useWallet();
  return useQuery({
    queryKey: ["my-proposals", address],
    queryFn: () => contract.getMyProposals(address!),
    enabled: !!address,
  });
}

export function useDisbursementHistory() {
  const contract = useContract();
  return useQuery({
    queryKey: ["disbursement-history"],
    queryFn: () => contract.getDisbursementHistory(),
    staleTime: 10000,
  });
}

export function useCommitteeMembers() {
  const contract = useContract();
  return useQuery({
    queryKey: ["committee-members"],
    queryFn: () => contract.getCommitteeMembers(),
    staleTime: 10000,
  });
}

export function useSubmitApplication() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      requestedAmountUsdCents: number;
      teamBackground: string;
      teamLinksJson: string;
      milestonesJson: string;
      marketContextJson: string;
      dueDiligenceJson: string;
    }) => contract.submitApplication(input),
    onSuccess: () => {
      toast.success("Application submitted. AI screening in progress.");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["my-proposals"] });
      qc.invalidateQueries({ queryKey: ["passed-screening-proposals"] });
    },
    onError: (err: Error) => toast.error(`Submission failed: ${err.message}`),
  });
}

export function useCastVote(proposalId: string) {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: "FOR" | "AGAINST" | "ABSTAIN") => contract.castVote(proposalId, vote),
    onSuccess: () => {
      toast.success("Committee vote recorded.");
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["member-vote", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (err: Error) => toast.error(`Vote failed: ${err.message}`),
  });
}

export function useExecuteProposal() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => contract.executeProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposal approved and scheduled for Arc treasury payout.");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["treasury-summary"] });
      qc.invalidateQueries({ queryKey: ["disbursement-history"] });
    },
    onError: (err: Error) => toast.error(`Execution failed: ${err.message}`),
  });
}

export function useSubmitMilestoneEvidence() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      milestoneId,
      evidenceUri,
      note,
    }: {
      proposalId: string;
      milestoneId: string;
      evidenceUri: string;
      note: string;
    }) => contract.submitMilestoneEvidence(proposalId, milestoneId, evidenceUri, note),
    onSuccess: () => {
      toast.success("Milestone evidence submitted.");
      qc.invalidateQueries({ queryKey: ["proposal"] });
      qc.invalidateQueries({ queryKey: ["my-proposals"] });
    },
    onError: (err: Error) => toast.error(`Evidence submission failed: ${err.message}`),
  });
}

export function useReviewMilestone() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, milestoneId }: { proposalId: string; milestoneId: string }) =>
      contract.reviewMilestone(proposalId, milestoneId),
    onSuccess: () => {
      toast.success("AI milestone review complete.");
      qc.invalidateQueries({ queryKey: ["proposal"] });
    },
    onError: (err: Error) => toast.error(`Milestone review failed: ${err.message}`),
  });
}

export function useReleaseTranche() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proposalId,
      milestoneId,
      arcTxHash,
    }: {
      proposalId: string;
      milestoneId: string;
      arcTxHash: string;
    }) => contract.releaseTranche(proposalId, milestoneId, arcTxHash),
    onSuccess: () => {
      toast.success("USDC tranche release recorded.");
      qc.invalidateQueries({ queryKey: ["proposal"] });
      qc.invalidateQueries({ queryKey: ["treasury-summary"] });
      qc.invalidateQueries({ queryKey: ["disbursement-history"] });
    },
    onError: (err: Error) => toast.error(`Tranche release failed: ${err.message}`),
  });
}

export function useFundTreasury() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountUsdCents: number) => contract.fundTreasury(amountUsdCents),
    onSuccess: () => {
      toast.success("Treasury funded.");
      qc.invalidateQueries({ queryKey: ["treasury-balance"] });
      qc.invalidateQueries({ queryKey: ["treasury-summary"] });
      qc.invalidateQueries({ queryKey: ["disbursement-history"] });
    },
    onError: (err: Error) => toast.error(`Funding failed: ${err.message}`),
  });
}

export function useUpdateThreshold() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threshold: number) => contract.updateThreshold(threshold),
    onSuccess: () => {
      toast.success("Threshold updated.");
      qc.invalidateQueries({ queryKey: ["score-threshold"] });
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

export function useUpdateMission() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mission: string) => contract.updateMission(mission),
    onSuccess: () => {
      toast.success("Mission updated.");
      qc.invalidateQueries({ queryKey: ["dao-mission"] });
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

export function useCancelProposal() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => contract.cancelProposal(proposalId),
    onSuccess: () => {
      toast.success("Application cancelled.");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["my-proposals"] });
    },
    onError: (err: Error) => toast.error(`Cancel failed: ${err.message}`),
  });
}

export function useSetCommitteeMember() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberAddress, allowed }: { memberAddress: string; allowed: boolean }) =>
      contract.setCommitteeMember(memberAddress, allowed),
    onSuccess: () => {
      toast.success("Committee updated.");
      qc.invalidateQueries({ queryKey: ["committee-members"] });
    },
    onError: (err: Error) => toast.error(`Committee update failed: ${err.message}`),
  });
}

export function useConfigureArcTreasury() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ arcTreasuryAddress, usdcTokenAddress }: { arcTreasuryAddress: string; usdcTokenAddress: string }) =>
      contract.configureArcTreasury(arcTreasuryAddress, usdcTokenAddress),
    onSuccess: () => {
      toast.success("Arc treasury configuration updated.");
      qc.invalidateQueries({ queryKey: ["treasury-summary"] });
    },
    onError: (err: Error) => toast.error(`Arc treasury update failed: ${err.message}`),
  });
}
