import { Link } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { Button } from "@/components/ui/button";
import { useAllProposals, useDaoMission, usePassedScreeningProposals, useTreasurySummary } from "@/hooks/useGrantAllocator";

const formatUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export default function LandingPage() {
  const { data: mission } = useDaoMission();
  const { data: treasury } = useTreasurySummary();
  const { data: proposals = [] } = useAllProposals();
  const { data: passedQueue = [] } = usePassedScreeningProposals();

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="ops-shell">
            <div className="ops-chip">AI + Committee Grants</div>
            <h1 className="mt-5 max-w-4xl text-5xl leading-none sm:text-6xl">
              Grants that screen with market intelligence, then release in milestone-linked USDC tranches.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
              CryptoRank-style market context, team due diligence, and detailed AI scoring narrow the queue before the
              committee ever votes. Approved grants move from GenLayer governance into the Arc treasury rail.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/submit">
                <Button className="rounded-full">Apply for funding</Button>
              </Link>
              <Link to="/vote">
                <Button variant="outline" className="rounded-full">
                  Open committee desk
                </Button>
              </Link>
            </div>
          </div>

          <div className="ops-shell bg-foreground text-background">
            <div className="text-xs uppercase tracking-[0.28em] text-background/65">Live Mission</div>
            <p className="mt-5 text-lg leading-8">{mission}</p>
            <div className="ops-rule my-6 bg-background/50" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-background/65">Treasury</div>
                <div className="mt-2 text-3xl font-bold">{formatUsd(treasury?.treasury_balance_usd_cents ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-background/65">AI-Passed Queue</div>
                <div className="mt-2 text-3xl font-bold">{passedQueue.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="ops-shell">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Applications</div>
            <div className="ops-number mt-3">{proposals.length}</div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Every submission becomes a full AI dossier before committee review.</p>
          </div>
          <div className="ops-shell">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Arc Rail</div>
            <div className="mt-3 break-all text-lg font-semibold">{treasury?.arc_treasury_address || "Configure Arc treasury address"}</div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Milestone payouts leave GenLayer and settle through the Arc USDC treasury rail.</p>
          </div>
          <div className="ops-shell">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">USDC Token</div>
            <div className="mt-3 break-all text-lg font-semibold">{treasury?.usdc_token_address || "Configure USDC token"}</div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Treasury accounting is denominated in USD cents across application scoring and releases.</p>
          </div>
        </section>
      </div>
    </DaoLayout>
  );
}
