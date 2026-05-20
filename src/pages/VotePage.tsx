import { Link } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { usePassedScreeningProposals } from "@/hooks/useGrantAllocator";

export default function VotePage() {
  const { data: proposals = [] } = usePassedScreeningProposals();

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="ops-shell">
          <div className="ops-chip">Committee Desk</div>
          <h1 className="mt-5 text-4xl leading-none sm:text-5xl">Only AI-passed applications enter the human voting room.</h1>
        </section>

        <section className="grid gap-4">
          {proposals.map((proposal) => (
            <Link key={proposal.proposal_id} to={`/proposals/${proposal.proposal_id}`} className="ops-shell block">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="ops-chip">{proposal.status}</div>
                  <h2 className="mt-4 text-2xl">{proposal.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{proposal.ai_packet.rationale}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="glass-card">
                    <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Composite</div>
                    <div className="mt-3 text-3xl font-bold">{proposal.ai_packet.composite ?? 0}</div>
                  </div>
                  <div className="glass-card">
                    <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Trust</div>
                    <div className="mt-3 text-3xl font-bold">{proposal.ai_packet.trust_score ?? 0}</div>
                  </div>
                  <div className="glass-card">
                    <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Market</div>
                    <div className="mt-3 text-3xl font-bold">{proposal.ai_packet.market_sentiment ?? 0}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </DaoLayout>
  );
}
