import { useMemo, useState } from "react";
import { DaoLayout } from "@/components/dao/DaoLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchMarketSnapshot, fetchTeamDueDiligence } from "@/lib/insights";
import { useSubmitApplication } from "@/hooks/useGrantAllocator";

const formatMilestones = (raw: string) =>
  JSON.stringify(
    raw
      .split("\n")
      .map((line, index) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [title, amount, description] = line.split("|").map((part) => part.trim());
        return {
          milestone_id: `ms-${index + 1}`,
          title: title || `Milestone ${index + 1}`,
          amount_usd_cents: Number(amount || 0) * 100,
          description: description || "",
          status: "PLANNED",
        };
      }),
  );

export default function SubmitPage() {
  const submitApplication = useSubmitApplication();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ecosystem, setEcosystem] = useState("GenLayer");
  const [requestedAmountUsd, setRequestedAmountUsd] = useState("25000");
  const [teamBackground, setTeamBackground] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [x, setX] = useState("");
  const [milestonesText, setMilestonesText] = useState("Prototype|10000|Build the first usable release\nPilot|15000|Deliver live integration and report");
  const [marketContext, setMarketContext] = useState('{"trend":"manual","narrative":"Awaiting market sync","sentiment":"neutral"}');
  const [dueDiligence, setDueDiligence] = useState('{"trust_summary":"Awaiting diligence","reputation_flags":[]}');
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [loadingDd, setLoadingDd] = useState(false);

  const teamLinksJson = useMemo(() => JSON.stringify({ website, github, x }, null, 2), [website, github, x]);

  return (
    <DaoLayout>
      <div className="space-y-8">
        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="ops-shell">
            <div className="ops-chip">Application Composer</div>
            <h1 className="mt-5 text-4xl leading-none sm:text-5xl">Build the AI dossier before the committee ever sees the grant.</h1>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Use the market and diligence pulls to prefill the exact JSON blobs the onchain AI layer will evaluate.
              Milestones should be entered one per line as `title|amount_usd|description`.
            </p>
          </div>

          <div className="ops-shell">
            <div className="grid gap-4">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project title" />
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[150px]" placeholder="What are you building and why should it exist?" />
              <div className="grid gap-4 md:grid-cols-2">
                <Input value={ecosystem} onChange={(event) => setEcosystem(event.target.value)} placeholder="Ecosystem or narrative" />
                <Input value={requestedAmountUsd} onChange={(event) => setRequestedAmountUsd(event.target.value)} placeholder="Requested USD amount" />
              </div>
              <Textarea
                value={teamBackground}
                onChange={(event) => setTeamBackground(event.target.value)}
                className="min-h-[120px]"
                placeholder="Team background, prior work, links to verifiable reputation."
              />
              <div className="grid gap-4 md:grid-cols-3">
                <Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Website" />
                <Input value={github} onChange={(event) => setGithub(event.target.value)} placeholder="GitHub" />
                <Input value={x} onChange={(event) => setX(event.target.value)} placeholder="X / Twitter" />
              </div>
              <Textarea
                value={milestonesText}
                onChange={(event) => setMilestonesText(event.target.value)}
                className="min-h-[130px]"
                placeholder="Prototype|10000|Ship MVP"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="glass-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ops-chip">CryptoRank Context</div>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={loadingMarket}
                      onClick={async () => {
                        setLoadingMarket(true);
                        try {
                          const snapshot = await fetchMarketSnapshot({ projectName: title, ecosystem });
                          setMarketContext(JSON.stringify(snapshot, null, 2));
                        } finally {
                          setLoadingMarket(false);
                        }
                      }}
                    >
                      {loadingMarket ? "Pulling..." : "Pull market snapshot"}
                    </Button>
                  </div>
                  <Textarea className="mt-4 min-h-[180px]" value={marketContext} onChange={(event) => setMarketContext(event.target.value)} />
                </div>

                <div className="glass-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ops-chip">Team Background Check</div>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      disabled={loadingDd}
                      onClick={async () => {
                        setLoadingDd(true);
                        try {
                          const report = await fetchTeamDueDiligence({
                            projectName: title,
                            website,
                            github,
                            x,
                            teamSummary: teamBackground,
                          });
                          setDueDiligence(JSON.stringify(report, null, 2));
                        } finally {
                          setLoadingDd(false);
                        }
                      }}
                    >
                      {loadingDd ? "Running..." : "Run diligence"}
                    </Button>
                  </div>
                  <Textarea className="mt-4 min-h-[180px]" value={dueDiligence} onChange={(event) => setDueDiligence(event.target.value)} />
                </div>
              </div>

              <Button
                className="w-fit rounded-full"
                disabled={submitApplication.isPending || title.length < 3 || description.length < 20}
                onClick={() =>
                  submitApplication.mutate({
                    title,
                    description,
                    requestedAmountUsdCents: Number(requestedAmountUsd) * 100,
                    teamBackground,
                    teamLinksJson,
                    milestonesJson: formatMilestones(milestonesText),
                    marketContextJson: marketContext,
                    dueDiligenceJson: dueDiligence,
                  })
                }
              >
                {submitApplication.isPending ? "Submitting..." : "Submit to AI screening"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DaoLayout>
  );
}
