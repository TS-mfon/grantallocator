import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useAllProposals } from "@/hooks/useGrantAllocator";
import { ProposalCard } from "@/components/dao/ProposalCard";
import { Loader2 } from "lucide-react";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Voting", value: "PENDING_VOTE" },
  { label: "Approved", value: "APPROVED" },
  { label: "AI Rejected", value: "REJECTED_BY_AI" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Evaluating", value: "PENDING_EVALUATION" },
];

export default function ProposalsPage() {
  const [filter, setFilter] = useState("");
  const { data: proposals = [], isLoading } = useAllProposals(filter);
  const navigate = useNavigate();

  return (
    <DaoLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Proposals Board</h1>
        <p className="text-muted-foreground">Browse all grant proposals and their AI evaluation scores.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No proposals found.</p>
          <p className="text-sm mt-2">Be the first to submit a proposal!</p>
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
