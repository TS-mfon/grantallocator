export interface MarketSnapshotInput {
  projectName: string;
  ecosystem: string;
}

export interface TeamDueDiligenceInput {
  projectName: string;
  website?: string;
  github?: string;
  x?: string;
  teamSummary: string;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchMarketSnapshot(input: MarketSnapshotInput) {
  const endpoint = import.meta.env.VITE_CRYPTORANK_PROXY_URL as string | undefined;
  if (!endpoint) {
    return {
      trend: "unavailable",
      narrative: `${input.ecosystem || "General"} market context not configured`,
      sentiment: "neutral",
      source: "manual-fallback",
    };
  }

  return fetchJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function fetchTeamDueDiligence(input: TeamDueDiligenceInput) {
  const endpoint = import.meta.env.VITE_TEAM_DD_PROXY_URL as string | undefined;
  if (!endpoint) {
    return {
      trust_summary: "Due diligence endpoint not configured",
      reputation_flags: [],
      source: "manual-fallback",
    };
  }

  return fetchJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
