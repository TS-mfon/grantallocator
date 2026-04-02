import { useNavigate } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useAllProposals } from "@/hooks/useGrantAllocator";
import { ProposalCard } from "@/components/dao/ProposalCard";
import { Loader2, Clock } from "lucide-react";

export default function VotePage() {
  const { data: proposals = [], isLoading } = useAllProposals("PENDING_VOTE");
  const navigate = useNavigate();

  return (
    <DaoLayout>
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Active Votes</h1>
        </div>
        <p className="text-muted-foreground">Proposals currently open for DAO member voting. AI recommendations shown on each.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No active votes right now.</p>
          <p className="text-sm mt-2">All proposals are either pending AI evaluation or have completed voting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.proposal_id}
              proposal={proposal}
              onClick={() => navigate(`/proposals/${proposal.proposal_id}`)}
            />
          ))}
        </div>
      )}
    </DaoLayout>
  );
}
