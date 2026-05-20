import { useEffect, useState } from "react";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCommitteeMembers,
  useConfigureArcTreasury,
  useDaoMission,
  useScoreThreshold,
  useSetCommitteeMember,
  useTreasurySummary,
  useUpdateMission,
  useUpdateThreshold,
} from "@/hooks/useGrantAllocator";

export default function AdminPage() {
  const { data: mission } = useDaoMission();
  const { data: threshold } = useScoreThreshold();
  const { data: treasury } = useTreasurySummary();
  const { data: committeeMembers = [] } = useCommitteeMembers();
  const updateMission = useUpdateMission();
  const updateThreshold = useUpdateThreshold();
  const setCommitteeMember = useSetCommitteeMember();
  const configureArc = useConfigureArcTreasury();

  const [missionDraft, setMissionDraft] = useState(mission || "");
  const [thresholdDraft, setThresholdDraft] = useState(String(threshold || 72));
  const [memberAddress, setMemberAddress] = useState("");
  const [arcTreasuryAddress, setArcTreasuryAddress] = useState(treasury?.arc_treasury_address || "");
  const [usdcTokenAddress, setUsdcTokenAddress] = useState(treasury?.usdc_token_address || "");

  useEffect(() => {
    if (mission) setMissionDraft(mission);
  }, [mission]);

  useEffect(() => {
    if (threshold !== undefined) setThresholdDraft(String(threshold));
  }, [threshold]);

  useEffect(() => {
    if (treasury?.arc_treasury_address) setArcTreasuryAddress(treasury.arc_treasury_address);
    if (treasury?.usdc_token_address) setUsdcTokenAddress(treasury.usdc_token_address);
  }, [treasury]);

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="ops-shell">
          <div className="ops-chip">Admin Surface</div>
          <h1 className="mt-5 text-4xl leading-none sm:text-5xl">Committee controls, scoring baseline, and Arc payout config.</h1>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="ops-shell space-y-4">
            <div className="ops-chip">Mission + Threshold</div>
            <Textarea className="min-h-[180px]" value={missionDraft} onChange={(event) => setMissionDraft(event.target.value)} />
            <Button className="rounded-full" disabled={updateMission.isPending} onClick={() => updateMission.mutate(missionDraft)}>
              Update mission
            </Button>
            <Input value={thresholdDraft} onChange={(event) => setThresholdDraft(event.target.value)} placeholder="AI threshold" />
            <Button className="rounded-full" variant="outline" disabled={updateThreshold.isPending} onClick={() => updateThreshold.mutate(Number(thresholdDraft))}>
              Update threshold
            </Button>
          </div>

          <div className="ops-shell space-y-4">
            <div className="ops-chip">Arc Treasury Config</div>
            <Input value={arcTreasuryAddress} onChange={(event) => setArcTreasuryAddress(event.target.value)} placeholder="Arc treasury contract address" />
            <Input value={usdcTokenAddress} onChange={(event) => setUsdcTokenAddress(event.target.value)} placeholder="Arc USDC token address" />
            <Button
              className="rounded-full"
              disabled={configureArc.isPending}
              onClick={() => configureArc.mutate({ arcTreasuryAddress, usdcTokenAddress })}
            >
              Save Arc config
            </Button>
          </div>
        </section>

        <section className="ops-shell">
          <div className="ops-chip">Committee Members</div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <Input value={memberAddress} onChange={(event) => setMemberAddress(event.target.value)} placeholder="0x committee member" />
            <Button className="rounded-full" disabled={setCommitteeMember.isPending} onClick={() => setCommitteeMember.mutate({ memberAddress, allowed: true })}>
              Add member
            </Button>
            <Button variant="outline" className="rounded-full" disabled={setCommitteeMember.isPending} onClick={() => setCommitteeMember.mutate({ memberAddress, allowed: false })}>
              Remove
            </Button>
          </div>
          <div className="mt-5 grid gap-3">
            {committeeMembers.map((member) => (
              <div key={member} className="glass-card text-sm">{member}</div>
            ))}
          </div>
        </section>
      </div>
    </DaoLayout>
  );
}
