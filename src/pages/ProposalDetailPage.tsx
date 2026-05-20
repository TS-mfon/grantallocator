import { useParams } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import {
  useProposal,
  useMemberVote,
  useCastVote,
  useExecuteProposal,
  useCancelProposal,
  useReviewMilestone,
  useReleaseTranche,
} from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const formatUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: proposal } = useProposal(id || "");
  const { address } = useWallet();
  const { data: myVote } = useMemberVote(id || "");
  const castVote = useCastVote(id || "");
  const executeProposal = useExecuteProposal();
  const cancelProposal = useCancelProposal();
  const reviewMilestone = useReviewMilestone();
  const releaseTranche = useReleaseTranche();
  const [arcTxHashes, setArcTxHashes] = useState<Record<string, string>>({});

  if (!proposal || !proposal.title) {
    return (
      <DaoLayout>
        <div className="ops-shell">Proposal not found.</div>
      </DaoLayout>
    );
  }

  const isApplicant = address?.toLowerCase() === proposal.applicant?.toLowerCase();

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="ops-shell">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="ops-chip">{proposal.status}</div>
                <h1 className="mt-5 text-4xl leading-none">{proposal.title}</h1>
                <p className="mt-4 text-sm uppercase tracking-[0.25em] text-muted-foreground">
                  Applicant {proposal.applicant}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Requested</div>
                <div className="mt-2 text-3xl font-bold">{formatUsd(proposal.requested_amount_usd_cents)}</div>
              </div>
            </div>
            <p className="mt-6 whitespace-pre-wrap text-sm leading-8 text-foreground/85">{proposal.description}</p>
            <div className="ops-rule my-6" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Composite</div>
                <div className="mt-3 text-3xl font-bold">{proposal.ai_packet.composite ?? 0}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Trust</div>
                <div className="mt-3 text-3xl font-bold">{proposal.ai_packet.trust_score ?? 0}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Recommended</div>
                <div className="mt-3 text-3xl font-bold">{formatUsd(proposal.approved_amount_usd_cents)}</div>
              </div>
            </div>
          </div>

          <div className="ops-shell">
            <div className="ops-chip">AI Breakdown</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Impact", proposal.ai_packet.impact],
                ["Feasibility", proposal.ai_packet.feasibility],
                ["Alignment", proposal.ai_packet.alignment],
                ["Market", proposal.ai_packet.market_sentiment],
                ["Narrative", proposal.ai_packet.narrative_fit],
                ["Trust", proposal.ai_packet.trust_score],
              ].map(([label, value]) => (
                <div key={label} className="glass-card">
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
                  <div className="mt-3 text-3xl font-bold">{value ?? 0}</div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">{proposal.ai_packet.rationale}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(proposal.ai_packet.risk_flags || []).map((flag) => (
                <span key={flag} className="ops-chip">{flag}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="ops-shell">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="ops-chip">Committee Vote</div>
                <h2 className="mt-4 text-2xl">Voting is enabled only after AI screening.</h2>
              </div>
              {myVote ? <div className="ops-chip">You voted {myVote}</div> : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">For</div>
                <div className="mt-3 text-3xl font-bold">{proposal.committee_votes_for}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Against</div>
                <div className="mt-3 text-3xl font-bold">{proposal.committee_votes_against}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Abstain</div>
                <div className="mt-3 text-3xl font-bold">{proposal.committee_votes_abstain}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={castVote.isPending || proposal.status !== "PENDING_VOTE"} className="rounded-full" onClick={() => castVote.mutate("FOR")}>
                Vote for
              </Button>
              <Button disabled={castVote.isPending || proposal.status !== "PENDING_VOTE"} variant="outline" className="rounded-full" onClick={() => castVote.mutate("AGAINST")}>
                Vote against
              </Button>
              <Button disabled={castVote.isPending || proposal.status !== "PENDING_VOTE"} variant="outline" className="rounded-full" onClick={() => castVote.mutate("ABSTAIN")}>
                Abstain
              </Button>
              <Button disabled={executeProposal.isPending || proposal.status !== "PENDING_VOTE"} variant="outline" className="rounded-full" onClick={() => executeProposal.mutate(id!)}>
                Approve schedule
              </Button>
              {isApplicant ? (
                <Button disabled={cancelProposal.isPending} variant="outline" className="rounded-full" onClick={() => cancelProposal.mutate(id!)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          <div className="ops-shell">
            <div className="ops-chip">Team Dossier</div>
            <pre className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground/85">
              {JSON.stringify(proposal.team_links, null, 2)}
            </pre>
            <div className="ops-rule my-5" />
            <pre className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">
              {JSON.stringify(proposal.due_diligence, null, 2)}
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <div className="ops-shell">
            <div className="ops-chip">Milestone Rail</div>
            <h2 className="mt-4 text-2xl">AI reviews completion before each tranche release.</h2>
          </div>

          {proposal.milestones.map((milestone) => (
            <div key={milestone.milestone_id} className="ops-shell">
              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <div className="ops-chip">{milestone.status}</div>
                  <h3 className="mt-4 text-2xl">{milestone.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{milestone.description}</p>
                  <p className="mt-3 text-sm font-semibold">{formatUsd(milestone.amount_usd_cents)}</p>
                  {milestone.ai_review ? (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm">Completion score: {milestone.ai_review.completion_score}</div>
                      <div className="text-sm text-muted-foreground">{milestone.ai_review.summary}</div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    disabled={reviewMilestone.isPending}
                    onClick={() => reviewMilestone.mutate({ proposalId: id!, milestoneId: milestone.milestone_id })}
                  >
                    Run AI milestone review
                  </Button>
                  <Input
                    value={arcTxHashes[milestone.milestone_id] || ""}
                    onChange={(event) =>
                      setArcTxHashes((current) => ({ ...current, [milestone.milestone_id]: event.target.value }))
                    }
                    placeholder="Arc USDC payout tx hash"
                  />
                  <Button
                    className="w-full rounded-full"
                    disabled={releaseTranche.isPending || !arcTxHashes[milestone.milestone_id]}
                    onClick={() =>
                      releaseTranche.mutate({
                        proposalId: id!,
                        milestoneId: milestone.milestone_id,
                        arcTxHash: arcTxHashes[milestone.milestone_id],
                      })
                    }
                  >
                    Record tranche release
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </DaoLayout>
  );
}
