import { useParams } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useProposal, useMemberVote, useCastVote, useExecuteProposal, useCancelProposal } from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { ScoreBar } from "@/components/dao/ScoreBar";
import { StatusBadge } from "@/components/dao/ProposalCard";
import { formatAddress } from "@/lib/genlayer/client";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp, ThumbsDown, MinusCircle, Play, XCircle } from "lucide-react";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: proposal, isLoading } = useProposal(id || "");
  const { address } = useWallet();
  const { data: myVote } = useMemberVote(id || "");
  const castVote = useCastVote(id || "");
  const executeProposal = useExecuteProposal();
  const cancelProposal = useCancelProposal();

  if (isLoading) {
    return (
      <DaoLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DaoLayout>
    );
  }

  if (!proposal || !proposal.title) {
    return (
      <DaoLayout>
        <div className="text-center py-20 text-muted-foreground">Proposal not found.</div>
      </DaoLayout>
    );
  }

  const scores = proposal.scores || {};
  const composite = scores.composite ?? 0;
  const canVote = proposal.status === "PENDING_VOTE" && !myVote && !!address;
  const isApplicant = address?.toLowerCase() === proposal.applicant?.toLowerCase();
  const canCancel = isApplicant && ["PENDING_EVALUATION", "PENDING_VOTE"].includes(proposal.status);
  const canExecute = proposal.status === "PENDING_VOTE" && !proposal.executed;

  return (
    <DaoLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{proposal.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>by {formatAddress(proposal.applicant, 16)}</span>
                <span>•</span>
                <span>{proposal.requested_amount.toLocaleString()} GEN requested</span>
              </div>
            </div>
            <StatusBadge status={proposal.status} />
          </div>
        </div>

        {/* AI Scorecard */}
        {composite > 0 && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">AI Evaluation</h2>
              <div className={`text-2xl font-bold font-mono ${composite >= 70 ? "text-score-pass" : "text-score-fail"}`}>
                {composite}/100
              </div>
            </div>
            <div className="space-y-4">
              <ScoreBar label="Impact" score={scores.impact ?? 0} maxScore={40} colorClass="bg-score-impact" delay={0} />
              <ScoreBar label="Feasibility" score={scores.feasibility ?? 0} maxScore={35} colorClass="bg-score-feasibility" delay={300} />
              <ScoreBar label="Alignment" score={scores.alignment ?? 0} maxScore={25} colorClass="bg-score-alignment" delay={600} />
            </div>
            {proposal.rationale && (
              <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm text-muted-foreground italic">"{proposal.rationale}"</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{proposal.description}</p>
        </div>

        {/* Team & Milestones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-3">Team Background</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.team_background}</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-3">Milestones</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.milestones}</p>
          </div>
        </div>

        {/* Voting */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Vote Tally</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-bold text-primary">{proposal.for_votes}</div>
              <div className="text-xs text-muted-foreground">For</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">{proposal.against_votes}</div>
              <div className="text-xs text-muted-foreground">Against</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted border border-border">
              <div className="text-2xl font-bold text-muted-foreground">{proposal.abstain_votes}</div>
              <div className="text-xs text-muted-foreground">Abstain</div>
            </div>
          </div>

          {myVote && (
            <p className="text-sm text-muted-foreground mb-4">You voted: <span className="font-semibold text-foreground">{myVote}</span></p>
          )}

          {canVote && (
            <div className="flex gap-3">
              <Button onClick={() => castVote.mutate("FOR")} disabled={castVote.isPending} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <ThumbsUp className="w-4 h-4" /> For
              </Button>
              <Button onClick={() => castVote.mutate("AGAINST")} disabled={castVote.isPending} variant="outline" className="flex-1 border-destructive/30 hover:bg-destructive/10 text-destructive gap-2">
                <ThumbsDown className="w-4 h-4" /> Against
              </Button>
              <Button onClick={() => castVote.mutate("ABSTAIN")} disabled={castVote.isPending} variant="outline" className="flex-1 gap-2">
                <MinusCircle className="w-4 h-4" /> Abstain
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {canExecute && (
            <Button onClick={() => executeProposal.mutate(id!)} disabled={executeProposal.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Play className="w-4 h-4" /> Execute Proposal
            </Button>
          )}
          {canCancel && (
            <Button onClick={() => cancelProposal.mutate(id!)} disabled={cancelProposal.isPending} variant="outline" className="border-destructive/30 text-destructive gap-2">
              <XCircle className="w-4 h-4" /> Cancel Proposal
            </Button>
          )}
        </div>
      </div>
    </DaoLayout>
  );
}
