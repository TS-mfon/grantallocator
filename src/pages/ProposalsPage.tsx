import { Link } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useAllProposals } from "@/hooks/useGrantAllocator";

const formatUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export default function ProposalsPage() {
  const { data: proposals = [] } = useAllProposals();

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="ops-shell">
          <div className="ops-chip">Application Dossiers</div>
          <h1 className="mt-5 text-4xl leading-none sm:text-5xl">Every application, with its AI screen already attached.</h1>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proposals.map((proposal, index) => (
            <Link
              key={proposal.proposal_id}
              to={`/proposals/${proposal.proposal_id}`}
              className="ops-shell transition-transform hover:-translate-y-1"
              style={{ transform: `translateY(${index % 3 === 1 ? "1.2rem" : "0"})` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="ops-chip">{proposal.status}</div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Score {proposal.ai_packet.composite ?? 0}
                </div>
              </div>
              <h2 className="mt-5 text-2xl">{proposal.title}</h2>
              <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted-foreground">{proposal.description}</p>
              <div className="ops-rule my-5" />
              <div className="flex items-center justify-between gap-4 text-sm">
                <span>{formatUsd(proposal.requested_amount_usd_cents)}</span>
                <span>{proposal.milestones.length} milestones</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </DaoLayout>
  );
}
