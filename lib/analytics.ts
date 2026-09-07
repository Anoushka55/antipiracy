import type { AppState } from "./types";
import { executiveOverview } from "./metrics";

export function computeOverview(_state: AppState) {
  return executiveOverview();
}

export function searchAll(state: AppState, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return { cases: [], findings: [], assets: [], evidence: [], entities: [] };
  return {
    cases: state.cases
      .filter((c) => [c.id, c.title, c.url, c.uploader, c.platform].join(" ").toLowerCase().includes(s))
      .slice(0, 8),
    findings: state.findings
      .filter((f) => [f.id, f.suspectedTitle, f.url, f.uploader].join(" ").toLowerCase().includes(s))
      .slice(0, 8),
    assets: state.catalogue
      .filter((a) => [a.id, a.title, a.isbn, a.author].join(" ").toLowerCase().includes(s))
      .slice(0, 8),
    evidence: state.evidence
      .filter((e) => [e.id, e.caseId, e.sourceUrl, e.sha256].join(" ").toLowerCase().includes(s))
      .slice(0, 8),
    entities: state.entities.filter((e) => [e.id, e.name, ...e.linkedDomains].join(" ").toLowerCase().includes(s)).slice(0, 8),
  };
}
