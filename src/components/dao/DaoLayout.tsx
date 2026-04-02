import { ReactNode } from "react";
import { DaoNavbar } from "./DaoNavbar";

export function DaoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DaoNavbar />
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span>Grant Allocator DAO</span>
          <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Powered by GenLayer
          </a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Docs
          </a>
        </div>
      </footer>
    </div>
  );
}
