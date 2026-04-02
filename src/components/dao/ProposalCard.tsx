import type { Proposal } from "@/lib/contracts/GrantAllocator";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    PENDING_EVALUATION: { className: "bg-accent/20 text-accent border-accent/30", label: "Evaluating" },
    PENDING_VOTE: { className: "bg-primary/20 text-primary border-primary/30", label: "Voting" },
    APPROVED: { className: "bg-score-pass/20 text-score-pass border-score-pass/30", label: "Approved" },
    REJECTED_BY_AI: { className: "bg-destructive/20 text-destructive border-destructive/30", label: "AI Rejected" },
    REJECTED: { className: "bg-destructive/20 text-destructive border-destructive/30", label: "Rejected" },
    LAPSED: { className: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30", label: "Lapsed" },
    CANCELLED: { className: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30", label: "Cancelled" },
  };

  const v = variants[status] || { className: "bg-muted text-muted-foreground", label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${v.className}`}>
      {v.label}
    </span>
  );
}

export function ProposalCard({ proposal, onClick }: { proposal: Proposal; onClick?: () => void }) {
  const composite = proposal.scores?.composite ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass-card p-5 hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {proposal.title}
        </h3>
        <StatusBadge status={proposal.status} />
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {proposal.description}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {composite > 0 && (
            <span className="font-mono font-semibold text-primary">
              Score: {composite}/100
            </span>
          )}
          <span>{proposal.requested_amount.toLocaleString()} GEN</span>
        </div>
        <div className="flex items-center gap-2">
          <span>👍 {proposal.for_votes}</span>
          <span>👎 {proposal.against_votes}</span>
        </div>
      </div>
    </button>
  );
}
