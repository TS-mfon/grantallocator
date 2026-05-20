import { useState } from "react";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyProposals, useSubmitMilestoneEvidence } from "@/hooks/useGrantAllocator";

export default function MyProposalsPage() {
  const { data: proposals = [] } = useMyProposals();
  const submitEvidence = useSubmitMilestoneEvidence();
  const [evidenceState, setEvidenceState] = useState<Record<string, { uri: string; note: string }>>({});

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="ops-shell">
          <div className="ops-chip">Applicant Workspace</div>
          <h1 className="mt-5 text-4xl leading-none sm:text-5xl">Track milestones and push evidence back into the release rail.</h1>
        </section>

        {proposals.map((proposal) => (
          <section key={proposal.proposal_id} className="ops-shell">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="ops-chip">{proposal.status}</div>
                <h2 className="mt-4 text-2xl">{proposal.title}</h2>
              </div>
              <div className="text-sm text-muted-foreground">{proposal.arc_grant_id || "Arc grant not scheduled yet"}</div>
            </div>

            <div className="mt-6 grid gap-4">
              {proposal.milestones.map((milestone) => {
                const key = `${proposal.proposal_id}:${milestone.milestone_id}`;
                const current = evidenceState[key] || { uri: "", note: "" };
                return (
                  <div key={milestone.milestone_id} className="glass-card">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="ops-chip">{milestone.status}</div>
                        <h3 className="mt-4 text-xl">{milestone.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{milestone.description}</p>
                      </div>
                      <div className="text-sm">{milestone.amount_usd_cents / 100} USD</div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Input
                        value={current.uri}
                        onChange={(event) =>
                          setEvidenceState((state) => ({ ...state, [key]: { ...current, uri: event.target.value } }))
                        }
                        placeholder="Evidence URL"
                      />
                      <Input
                        value={current.note}
                        onChange={(event) =>
                          setEvidenceState((state) => ({ ...state, [key]: { ...current, note: event.target.value } }))
                        }
                        placeholder="Evidence note"
                      />
                      <Button
                        className="rounded-full"
                        disabled={submitEvidence.isPending || !current.uri}
                        onClick={() =>
                          submitEvidence.mutate({
                            proposalId: proposal.proposal_id,
                            milestoneId: milestone.milestone_id,
                            evidenceUri: current.uri,
                            note: current.note,
                          })
                        }
                      >
                        Submit evidence
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </DaoLayout>
  );
}
