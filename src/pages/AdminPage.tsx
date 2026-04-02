import { useState } from "react";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { useDaoMission, useScoreThreshold, useUpdateThreshold, useUpdateMission } from "@/hooks/useGrantAllocator";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, AlertCircle } from "lucide-react";

export default function AdminPage() {
  const { isConnected } = useWallet();
  const { data: mission = "" } = useDaoMission();
  const { data: threshold = 70 } = useScoreThreshold();
  const updateThreshold = useUpdateThreshold();
  const updateMission = useUpdateMission();

  const [newThreshold, setNewThreshold] = useState("");
  const [newMission, setNewMission] = useState("");

  if (!isConnected) {
    return (
      <DaoLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">Connect the DAO owner wallet to access admin settings.</p>
        </div>
      </DaoLayout>
    );
  }

  return (
    <DaoLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">DAO Admin</h1>
        </div>

        {/* Current Settings */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Settings</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Score Threshold:</span>{" "}
              <span className="font-semibold text-primary">{threshold}/100</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mission:</span>
              <p className="mt-1 text-foreground">{mission}</p>
            </div>
          </div>
        </div>

        {/* Update Threshold */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Update Score Threshold</h2>
          <div className="flex gap-3">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="New threshold (0-100)"
              value={newThreshold}
              onChange={e => setNewThreshold(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => { updateThreshold.mutate(Number(newThreshold)); setNewThreshold(""); }}
              disabled={updateThreshold.isPending || !newThreshold}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Update
            </Button>
          </div>
        </div>

        {/* Update Mission */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Update DAO Mission</h2>
          <div className="space-y-3">
            <div>
              <Label>New Mission Statement</Label>
              <Textarea
                value={newMission}
                onChange={e => setNewMission(e.target.value)}
                maxLength={3000}
                placeholder="Enter new mission statement..."
                rows={4}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">{newMission.length}/3000</p>
            </div>
            <Button
              onClick={() => { updateMission.mutate(newMission); setNewMission(""); }}
              disabled={updateMission.isPending || !newMission}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Update Mission
            </Button>
          </div>
        </div>
      </div>
    </DaoLayout>
  );
}
