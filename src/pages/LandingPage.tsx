import { DaoLayout } from "@/components/dao/DaoLayout";
import { useTreasuryBalance, useDaoMission, useAllProposals, useScoreThreshold } from "@/hooks/useGrantAllocator";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Users, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const { data: treasury = 0 } = useTreasuryBalance();
  const { data: mission = "" } = useDaoMission();
  const { data: proposals = [] } = useAllProposals();
  const { data: threshold = 70 } = useScoreThreshold();

  const approved = proposals.filter(p => p.status === "APPROVED").length;
  const totalDisbursed = proposals.filter(p => p.executed).reduce((sum, p) => sum + p.requested_amount, 0);

  return (
    <DaoLayout>
      {/* Hero */}
      <div className="text-center mb-16 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
          <Shield className="w-4 h-4" /> AI-Powered Grant Governance
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
          Grant Allocator{" "}
          <span className="gradient-text">DAO</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {mission || "A shared grant pool where AI evaluates proposals against the DAO mission, and human members vote on the best ones."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/submit">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 px-6 text-base">
              Submit Proposal <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/proposals">
            <Button variant="outline" className="gap-2 h-12 px-6 text-base border-border hover:border-primary/30">
              View Proposals
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: "Treasury Balance", value: `${treasury.toLocaleString()} GEN`, icon: TrendingUp },
          { label: "Total Proposals", value: proposals.length, icon: Zap },
          { label: "Approved", value: approved, icon: Shield },
          { label: "Total Disbursed", value: `${totalDisbursed.toLocaleString()} GEN`, icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-5 text-center animate-slide-up">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="glass-card p-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Submit", desc: "Anyone can submit a funding proposal with project details and budget." },
            { step: "2", title: "AI Evaluates", desc: `The AI scores proposals on Impact, Feasibility, and Alignment. Below ${threshold}/100 are filtered out.` },
            { step: "3", title: "DAO Votes", desc: "Qualified proposals go to DAO members for voting with AI recommendations visible." },
            { step: "4", title: "Funds Released", desc: "Approved proposals automatically receive funding from the treasury." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </DaoLayout>
  );
}
