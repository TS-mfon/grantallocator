import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useSubmitApplication, useScoreThreshold } from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Send, AlertCircle } from "lucide-react";

const STEPS = ["Project Info", "Team Background", "Milestones", "Budget", "Review"];

export default function SubmitPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "", description: "", teamBackground: "", milestones: "", requestedAmount: "",
  });
  const { isConnected } = useWallet();
  const { data: threshold = 70 } = useScoreThreshold();
  const submit = useSubmitApplication();
  const navigate = useNavigate();

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const canNext = () => {
    if (step === 0) return form.title.length > 0 && form.description.length > 0;
    if (step === 1) return form.teamBackground.length > 0;
    if (step === 2) return form.milestones.length > 0;
    if (step === 3) return Number(form.requestedAmount) > 0;
    return true;
  };

  const handleSubmit = async () => {
    try {
      const receipt = await submit.mutateAsync({
        title: form.title,
        description: form.description,
        requestedAmount: Number(form.requestedAmount),
        teamBackground: form.teamBackground,
        milestones: form.milestones,
      });
      // Try to extract proposal_id from receipt
      const proposalNonce = Math.max(0, 0); // We'll navigate to proposals list
      navigate("/my-proposals");
    } catch {}
  };

  if (!isConnected) {
    return (
      <DaoLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">You need to connect your wallet to submit a proposal.</p>
        </div>
      </DaoLayout>
    );
  }

  return (
    <DaoLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Submit Application</h1>
        <p className="text-muted-foreground mb-8">
          Your proposal will be evaluated by AI. Score threshold: <span className="text-primary font-semibold">{threshold}/100</span>
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Project Title</Label>
                <Input value={form.title} onChange={e => set("title", e.target.value)} maxLength={100} placeholder="e.g. Open Source Dev Tools" className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{form.title.length}/100</p>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} maxLength={2000} placeholder="Describe your project, its goals, and expected impact..." rows={6} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{form.description.length}/2000</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <Label>Team Background</Label>
              <Textarea value={form.teamBackground} onChange={e => set("teamBackground", e.target.value)} maxLength={1000} placeholder="Describe your team's experience, past projects, and relevant skills..." rows={8} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{form.teamBackground.length}/1000</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <Label>Milestone Plan</Label>
              <Textarea value={form.milestones} onChange={e => set("milestones", e.target.value)} maxLength={1500} placeholder="List your key milestones with timelines..." rows={8} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{form.milestones.length}/1500</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <Label>Requested Amount (GEN)</Label>
              <Input type="number" value={form.requestedAmount} onChange={e => set("requestedAmount", e.target.value)} placeholder="e.g. 5000" className="mt-1.5" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Your Application</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{form.title}</span></div>
                <div><span className="text-muted-foreground">Description:</span> <p className="mt-1 text-muted-foreground">{form.description}</p></div>
                <div><span className="text-muted-foreground">Team:</span> <p className="mt-1 text-muted-foreground">{form.teamBackground}</p></div>
                <div><span className="text-muted-foreground">Milestones:</span> <p className="mt-1 text-muted-foreground">{form.milestones}</p></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{Number(form.requestedAmount).toLocaleString()} GEN</span></div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submit.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                {submit.isPending ? (
                  <><span className="animate-spin">⏳</span> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit & Sign</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DaoLayout>
  );
}
