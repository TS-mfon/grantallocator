import { useState } from "react";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useTreasuryBalance, useDisbursementHistory, useFundTreasury } from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { formatAddress } from "@/lib/genlayer/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function TreasuryPage() {
  const { data: balance = 0, isLoading } = useTreasuryBalance();
  const { data: history = [] } = useDisbursementHistory();
  const { isConnected } = useWallet();
  const fundTreasury = useFundTreasury();
  const [amount, setAmount] = useState("");

  const handleFund = () => {
    if (Number(amount) > 0) {
      fundTreasury.mutate(Number(amount));
      setAmount("");
    }
  };

  return (
    <DaoLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Treasury Dashboard</h1>
        <p className="text-muted-foreground">Manage the DAO funding pool.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Current Balance</h2>
          </div>
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <div className="text-4xl font-bold text-foreground">{balance.toLocaleString()} <span className="text-lg text-muted-foreground">GEN</span></div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-3">Fund Pool</h2>
          {isConnected ? (
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="Amount (GEN)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Button
                onClick={handleFund}
                disabled={fundTreasury.isPending || Number(amount) <= 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {fundTreasury.isPending ? "Processing..." : "Fund Treasury"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Connect wallet to fund.</p>
          )}
        </div>
      </div>

      {/* Disbursement History */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-3">
                  {item.type === "funding" ? (
                    <ArrowDownCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-accent" />
                  )}
                  <div>
                    <div className="text-sm font-medium capitalize">{item.type}</div>
                    {item.recipient && <div className="text-xs text-muted-foreground">To: {formatAddress(item.recipient, 16)}</div>}
                    {item.proposal_id && <div className="text-xs text-muted-foreground">{item.proposal_id}</div>}
                  </div>
                </div>
                <div className="text-sm font-mono font-semibold">
                  {item.type === "funding" ? "+" : "-"}{(item.amount || 0).toLocaleString()} GEN
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DaoLayout>
  );
}
