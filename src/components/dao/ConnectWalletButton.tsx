import { useState } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { formatAddress } from "@/lib/genlayer/client";
import { Button } from "@/components/ui/button";
import { User, LogOut, Wallet, ArrowLeftRight } from "lucide-react";

export function ConnectWalletButton() {
  const { address, isConnected, isLoading, connectWallet, disconnectWallet, switchWalletAccount } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (!isConnected) {
    return (
      <Button
        onClick={() => connectWallet().catch(() => {})}
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
      >
        <Wallet className="w-4 h-4" />
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowMenu(!showMenu)}
        className="gap-2 border-primary/30 hover:border-primary/60"
      >
        <User className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm">{formatAddress(address)}</span>
      </Button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 glass-card p-2 z-50 animate-fade-in">
            <button
              onClick={() => { switchWalletAccount().catch(() => {}); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-secondary transition-colors text-foreground"
            >
              <ArrowLeftRight className="w-4 h-4" /> Switch Account
            </button>
            <button
              onClick={() => { disconnectWallet(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/20 transition-colors text-destructive"
            >
              <LogOut className="w-4 h-4" /> Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
