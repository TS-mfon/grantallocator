import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { CONTRACT_ADDRESS } from "@/lib/genlayer/client";
import GrantAllocatorContract from "@/lib/contracts/GrantAllocator";
import type { Proposal } from "@/lib/contracts/GrantAllocator";
import { toast } from "sonner";

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

export function useProposal(proposalId: string) {
  const contract = useContract();
  return useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => contract.getProposal(proposalId),
    enabled: !!proposalId,
    refetchInterval: (query) => {
      const data = query.state.data as Proposal | undefined;
      return data?.status === "PENDING_EVALUATION" ? 3000 : false;
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

export function useSubmitApplication() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description: string; requestedAmount: number; teamBackground: string; milestones: string }) =>
      contract.submitApplication(data.title, data.description, data.requestedAmount, data.teamBackground, data.milestones),
    onSuccess: () => {
      toast.success("Application submitted! AI evaluation in progress...");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["my-proposals"] });
    },
    onError: (err: Error) => toast.error(`Submission failed: ${err.message}`),
  });
}

export function useCastVote(proposalId: string) {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: "FOR" | "AGAINST" | "ABSTAIN") => contract.castVote(proposalId, vote),
    onMutate: (vote) => { toast.loading(`Submitting ${vote} vote...`); },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Vote recorded on-chain!");
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["member-vote", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (err: Error) => { toast.dismiss(); toast.error(`Vote failed: ${err.message}`); },
  });
}

export function useFundTreasury() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => contract.fundTreasury(amount),
    onSuccess: () => {
      toast.success("Treasury funded!");
      qc.invalidateQueries({ queryKey: ["treasury-balance"] });
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
      toast.success("Threshold updated!");
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
      toast.success("Mission updated!");
      qc.invalidateQueries({ queryKey: ["dao-mission"] });
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });
}

export function useExecuteProposal() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => contract.executeProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposal executed! Funds disbursed.");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["treasury-balance"] });
      qc.invalidateQueries({ queryKey: ["disbursement-history"] });
    },
    onError: (err: Error) => toast.error(`Execution failed: ${err.message}`),
  });
}

export function useCancelProposal() {
  const contract = useContract();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => contract.cancelProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposal cancelled.");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["my-proposals"] });
    },
    onError: (err: Error) => toast.error(`Cancel failed: ${err.message}`),
  });
}
