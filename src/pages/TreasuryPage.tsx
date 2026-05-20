import { DaoLayout } from "@/components/dao/DaoLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDisbursementHistory, useFundTreasury, useTreasurySummary } from "@/hooks/useGrantAllocator";
import { useState } from "react";

const formatUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export default function TreasuryPage() {
  const { data: summary } = useTreasurySummary();
  const { data: history = [] } = useDisbursementHistory();
  const fundTreasury = useFundTreasury();
  const [amount, setAmount] = useState("50000");

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="ops-shell">
            <div className="ops-chip">Treasury Rail</div>
            <h1 className="mt-5 text-4xl leading-none sm:text-5xl">GenLayer approvals. Arc USDC settlement.</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Treasury</div>
                <div className="mt-3 text-3xl font-bold">{formatUsd(summary?.treasury_balance_usd_cents ?? 0)}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Arc Treasury</div>
                <div className="mt-3 break-all text-sm">{summary?.arc_treasury_address || "Not set"}</div>
              </div>
              <div className="glass-card">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">USDC</div>
                <div className="mt-3 break-all text-sm">{summary?.usdc_token_address || "Not set"}</div>
              </div>
            </div>
          </div>

          <div className="ops-shell">
            <div className="ops-chip">Fund Pool</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
              <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="USD amount" />
              <Button className="rounded-full" disabled={fundTreasury.isPending || !amount} onClick={() => fundTreasury.mutate(Number(amount) * 100)}>
                Add USD ledger value
              </Button>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Treasury accounting is stored in USD cents on GenLayer. Actual stablecoin movement is expected on the Arc
              USDC rail and then recorded back through tranche releases.
            </p>
          </div>
        </section>

        <section className="ops-shell">
          <div className="ops-chip">History</div>
          <div className="mt-5 grid gap-3">
            {history.map((item, index) => (
              <div key={`${item.type}-${index}`} className="glass-card">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-foreground/85">{JSON.stringify(item, null, 2)}</pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DaoLayout>
  );
}
