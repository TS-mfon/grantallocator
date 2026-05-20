import { Link, useLocation } from "react-router-dom";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { path: "/", label: "Overview" },
  { path: "/proposals", label: "Dossiers" },
  { path: "/vote", label: "Committee Desk" },
  { path: "/submit", label: "Apply" },
  { path: "/treasury", label: "Treasury Rail" },
  { path: "/my-proposals", label: "Milestones" },
  { path: "/admin", label: "Admin" },
];

export function DaoNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground bg-primary text-primary-foreground">
            GA
          </div>
          <div className="leading-none">
            <div className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Grant Ops</div>
            <div className="font-display text-lg font-bold">Allocator</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 xl:flex">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ConnectWalletButton />
          <button className="rounded-full p-2 xl:hidden" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mx-auto mt-2 max-w-7xl rounded-3xl border border-border bg-background/95 p-3 backdrop-blur xl:hidden">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm ${location.pathname === item.path ? "bg-foreground text-background" : "bg-secondary/50"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
