import { useNavigate } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useMyProposals } from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { ProposalCard } from "@/components/dao/ProposalCard";
import { Loader2, AlertCircle, FileText } from "lucide-react";

export default function MyProposalsPage() {
  const { isConnected } = useWallet();
  const { data: proposals = [], isLoading } = useMyProposals();
  const navigate = useNavigate();

  if (!isConnected) {
    return (
      <DaoLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Connect your wallet to view your submitted proposals.</p>
        </div>
      </DaoLayout>
    );
  }

  return (
    <DaoLayout>
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">My Proposals</h1>
        </div>
        <p className="text-muted-foreground">Track all your submitted proposals and their statuses.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">You haven't submitted any proposals yet.</p>
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
