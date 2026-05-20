import type { ReactNode } from "react";
import { DaoNavbar } from "./DaoNavbar";

export function DaoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DaoNavbar />
      <main className="px-4 pb-12 pt-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <footer className="px-4 pb-8 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-full border border-border bg-background/70 px-5 py-3 text-xs uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
          <span>Grant Allocator</span>
          <span>AI Screening on GenLayer</span>
          <span>USDC Rail on Arc Testnet</span>
        </div>
      </footer>
    </div>
  );
}
