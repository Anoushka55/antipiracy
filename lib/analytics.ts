import type { AppState, CaseRecord, RiskLevel } from "./types";
import { executiveOverview } from "./metrics";
import { CASE_STATUS_LABEL } from "./constants";
import { caseFilterHref, filterCases, type CaseFilter } from "./case-filters";

export function computeOverview(state: AppState) {
  return executiveOverview(state);
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

// ---------------------------------------------------------------------------
// KPI drill-downs: one computed insight, the few records that matter most, and
// a shortcut to the full list. Everything here is derived from the live store.
// ---------------------------------------------------------------------------

export type KpiKey =
  | "activeCases"
  | "criticalHigh"
  | "takedownRate"
  | "avgRemovalDays"
  | "slaBreachRate"
  | "reappearanceRate"
  | "closedLoop"
  | "priorityTitleExposure"
  | "estimatedExposureCr";

export type KpiTone = "red" | "amber" | "blue" | "grey" | "green";

export interface KpiRow {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  metric?: string;
  badge?: { label: string; tone: KpiTone };
}

export interface KpiLink {
  href: string;
  label: string;
}

export interface KpiDrilldown {
  insight: string;
  rowsTitle: string;
  rows: KpiRow[];
  link: KpiLink;
  secondary?: KpiLink;
}

const RISK_RANK: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SLA_RANK: Record<CaseRecord["slaState"], number> = { breached: 0, approaching: 1, within: 2 };
const REMOVED_STATUSES = ["removed", "monitoring", "closed", "reopened"];
const RISK_TONE: Record<RiskLevel, KpiTone> = {
  critical: "red",
  high: "amber",
  medium: "blue",
  low: "grey",
};
const RISK_LABEL: Record<RiskLevel, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const NOW = new Date("2026-09-04T10:00:00Z");
const HOUR = 3600 * 1000;

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const pct1 = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
/** "18h" under two days, "8.8 days" beyond. */
const duration = (hours: number) => (hours < 48 ? `${hours}h` : `${Math.round((hours / 24) * 10) / 10} days`);

function topBy<T>(rows: T[], key: (r: T) => string): { name: string; n: number } {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(key(r), (counts.get(key(r)) ?? 0) + 1));
  let best = { name: "", n: 0 };
  counts.forEach((n, name) => {
    if (n > best.n) best = { name, n };
  });
  return best;
}

/** Most urgent first: not yet removed, then risk, then SLA state, then age. */
function byUrgency(a: CaseRecord, b: CaseRecord): number {
  const stage = (c: CaseRecord) => (REMOVED_STATUSES.includes(c.status) ? 1 : 0);
  return (
    stage(a) - stage(b) ||
    RISK_RANK[a.risk] - RISK_RANK[b.risk] ||
    SLA_RANK[a.slaState] - SLA_RANK[b.slaState] ||
    b.daysOpen - a.daysOpen
  );
}

function caseRow(c: CaseRecord, metric?: string): KpiRow {
  return {
    id: c.id,
    title: c.title,
    subtitle: `${c.id} · ${c.platform} · ${CASE_STATUS_LABEL[c.status] ?? c.status}`,
    href: `/cases/${c.id}`,
    metric: metric ?? `${c.daysOpen}d open`,
    badge: { label: RISK_LABEL[c.risk], tone: RISK_TONE[c.risk] },
  };
}

function hoursOverdue(c: CaseRecord): number {
  return Math.max(0, Math.round((NOW.getTime() - new Date(c.slaDueAt).getTime()) / HOUR));
}

function removalDaysByCase(state: AppState): Map<string, number> {
  const out = new Map<string, number>();
  state.platformResponses
    .filter((r) => r.outcome === "removed")
    .forEach((r) => {
      const sub = state.submissions.find((s) => s.id === r.submissionId);
      if (!sub) return;
      const days = (new Date(r.receivedAt).getTime() - new Date(sub.submittedAt).getTime()) / (24 * HOUR);
      if (days > 0) out.set(r.caseId, Math.round(days * 10) / 10);
    });
  return out;
}

function listLink(state: AppState, f: CaseFilter, noun: string): KpiLink {
  const n = filterCases(state, f).length;
  return { href: caseFilterHref(f), label: `View all ${n} ${noun}` };
}

export function kpiDrilldown(state: AppState, kpi: KpiKey): KpiDrilldown {
  const active = filterCases(state, { active: true });
  const catalogue = new Map(state.catalogue.map((a) => [a.id, a]));

  switch (kpi) {
    case "activeCases": {
      const top = topBy(active, (c) => c.platform);
      const breached = active.filter((c) => c.slaState === "breached").length;
      const approaching = active.filter((c) => c.slaState === "approaching").length;
      const waiting = active.filter((c) => !REMOVED_STATUSES.includes(c.status));
      const oldest = [...waiting].sort((a, b) => b.daysOpen - a.daysOpen)[0];
      return {
        insight:
          `${top.name} holds ${top.n} of the ${active.length} active cases (${pct(top.n, active.length)}%). ` +
          `${waiting.length} are still waiting for removal: ${breached} are past SLA and ${approaching} more are close to breaching.` +
          (oldest ? ` The longest wait is ${oldest.id} (${oldest.title}), open ${oldest.daysOpen} days.` : ""),
        rowsTitle: "Most urgent active cases",
        rows: [...active].sort(byUrgency).slice(0, 5).map((c) => caseRow(c)),
        link: listLink(state, { active: true }, "active cases"),
      };
    }

    case "criticalHigh": {
      const f: CaseFilter = { active: true, risk: ["critical", "high"] };
      const rows = filterCases(state, f);
      const waiting = rows.filter((c) => !REMOVED_STATUSES.includes(c.status));
      const late = rows.filter((c) => c.slaState !== "within").length;
      const top = topBy(rows, (c) => c.platform);
      const critical = rows.filter((c) => c.risk === "critical");
      const criticalRemoved = critical.filter((c) => REMOVED_STATUSES.includes(c.status)).length;
      return {
        insight:
          `${criticalRemoved} of the ${critical.length} critical cases are already removed and under monitoring. ` +
          `${waiting.length} critical or high cases are still live, ${late} are past or close to SLA, and ${top.name} carries the most of them (${top.n}).`,
        rowsTitle: "Critical and high cases to act on first",
        rows: [...rows].sort(byUrgency).slice(0, 5).map((c) => caseRow(c)),
        link: listLink(state, f, "critical and high cases"),
      };
    }

    case "takedownRate": {
      const dispatched = state.notices.filter((n) => n.status === "dispatched").length;
      const removed = state.platformResponses.filter((r) => r.outcome === "removed").length;
      const f: CaseFilter = { status: ["submitted", "awaiting_response", "escalated"] };
      const open = filterCases(state, f);
      const count = (s: string) => open.filter((c) => c.status === s).length;
      const waitedHours = (c: CaseRecord) => {
        const sub = state.submissions.find((s) => s.id === c.submissionId);
        return sub ? Math.round((NOW.getTime() - new Date(sub.submittedAt).getTime()) / HOUR) : 0;
      };
      return {
        insight:
          `${removed} of ${dispatched} notices sent led to removal. The other ${open.length} are still open: ` +
          `${count("escalated")} escalated after breaching SLA, ${count("awaiting_response")} awaiting a platform response and ${count("submitted")} not yet acknowledged by the platform.`,
        rowsTitle: "Open notices, longest waiting first",
        rows: [...open]
          .sort((a, b) => waitedHours(b) - waitedHours(a))
          .slice(0, 5)
          .map((c) => caseRow(c, `${duration(waitedHours(c))} waiting`)),
        link: listLink(state, f, "open notices"),
        secondary: { href: "/enforcement", label: "Open the enforcement queue" },
      };
    }

    case "avgRemovalDays": {
      const days = removalDaysByCase(state);
      const byPlatform = new Map<string, number[]>();
      state.cases.forEach((c) => {
        const d = days.get(c.id);
        if (d === undefined) return;
        byPlatform.set(c.platform, [...(byPlatform.get(c.platform) ?? []), d]);
      });
      const avgs = [...byPlatform.entries()]
        .map(([name, ds]) => ({ name, avg: Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 }))
        .sort((a, b) => b.avg - a.avg);
      const slow = avgs[0];
      const second = avgs[1];
      const fast = avgs[avgs.length - 1];
      const slowest = state.cases
        .filter((c) => days.has(c.id))
        .sort((a, b) => (days.get(b.id) ?? 0) - (days.get(a.id) ?? 0))
        .slice(0, 5);
      const f: CaseFilter = { status: REMOVED_STATUSES };
      return {
        insight:
          `${slow.name} takedowns take ${slow.avg} days on average and ${second.name} ${second.avg} days, ` +
          `against ${fast.avg} days on ${fast.name}. Escalate ${slow.name.toLowerCase()} and ${second.name.toLowerCase()} notices early instead of waiting for the average.`,
        rowsTitle: "Slowest removals",
        rows: slowest.map((c) => caseRow(c, `${days.get(c.id)} days`)),
        link: listLink(state, f, "removed cases"),
        secondary: { href: "/enforcement", label: "Open the enforcement queue" },
      };
    }

    case "slaBreachRate": {
      const f: CaseFilter = { active: true, sla: ["breached"] };
      const breached = filterCases(state, f);
      const approaching = filterCases(state, { active: true, sla: ["approaching"] });
      const escalated = new Set(state.escalations.map((e) => e.caseId));
      const notEscalated = breached.filter((c) => !escalated.has(c.id)).length;
      const top = topBy(breached, (c) => c.platform);
      return {
        insight:
          `${plural(breached.length, "active case")} ${breached.length === 1 ? "is" : "are"} past SLA and ${approaching.length} more will breach soon. ` +
          (notEscalated === 0
            ? `All of the breached cases are already escalated to Lead and Legal. `
            : `${notEscalated} breached ${notEscalated === 1 ? "case is" : "cases are"} not escalated yet. `) +
          `${top.name} has the most (${top.n}).`,
        rowsTitle: "Breached cases, most overdue first",
        rows: [...breached]
          .sort((a, b) => hoursOverdue(b) - hoursOverdue(a))
          .slice(0, 5)
          .map((c) => caseRow(c, `${duration(hoursOverdue(c))} overdue`)),
        link: listLink(state, f, "breached cases"),
        secondary: { href: caseFilterHref({ active: true, sla: ["approaching"] }), label: `View ${approaching.length} about to breach` },
      };
    }

    case "reappearanceRate":
    case "closedLoop": {
      const reapps = [...state.reappearances].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
      const monitored = state.monitoringJobs.length;
      const topUploader = topBy(reapps, (r) => r.uploader);
      const confirmed = reapps.filter((r) => r.confirmed).length;
      const reopened = new Set(state.cases.filter((c) => c.status === "reopened").map((c) => c.id));
      const reopenedCount = reapps.filter((r) => reopened.has(r.originalCaseId)).length;
      const insight =
        kpi === "closedLoop"
          ? `Every one of the ${reapps.length} resurfaced items is linked back to its original case, so its history and evidence carry over. ` +
            `${confirmed} links are confirmed by an investigator and ${reopenedCount} cases have been reopened; ${reapps.length - confirmed} still need confirmation.`
          : `${reapps.length} removed items resurfaced out of ${monitored} under monitoring (${pct1(reapps.length, monitored)}%). ` +
            `${topUploader.name} is behind ${topUploader.n} of them. ${confirmed} are confirmed and ${reopenedCount} cases reopened; ${reapps.length - confirmed} still need an investigator to confirm the link.`;
      return {
        insight,
        rowsTitle: "Latest reappearances",
        rows: reapps.slice(0, 5).map((r) => {
          const original = state.cases.find((c) => c.id === r.originalCaseId);
          return {
            id: r.id,
            title: original?.title ?? r.originalCaseId,
            subtitle: `${r.originalCaseId} · resurfaced on ${r.platform} · ${r.uploader}`,
            href: `/cases/${r.originalCaseId}`,
            metric: `${r.similarity}% match`,
            badge: r.confirmed ? { label: "Confirmed", tone: "green" as const } : { label: "Needs review", tone: "amber" as const },
          };
        }),
        link: { href: "/radar", label: `Open Reappearance Radar (${reapps.length})` },
        secondary: listLink(state, { reappearance: true }, "resurfaced cases"),
      };
    }

    case "priorityTitleExposure": {
      const f: CaseFilter = { active: true, priorityTitle: true };
      const onPriority = filterCases(state, f);
      const titles = state.catalogue
        .filter((a) => a.priorityTitle)
        .map((a) => ({
          a,
          n: onPriority.filter((c) => c.assetId === a.id).length,
          critical: onPriority.filter((c) => c.assetId === a.id && c.risk === "critical").length,
        }))
        .sort((x, y) => y.n - x.n);
      const criticalAll = active.filter((c) => c.risk === "critical").length;
      const criticalOnPriority = onPriority.filter((c) => c.risk === "critical").length;
      const top = titles[0];
      return {
        insight:
          `${onPriority.length} of the ${active.length} active cases sit on ${titles.length} flagship titles. ` +
          `${top.a.title} alone accounts for ${top.n}` +
          (criticalAll === criticalOnPriority ? `, and all ${criticalAll} critical cases are on flagship titles.` : `, and ${criticalOnPriority} of ${criticalAll} critical cases are on flagship titles.`),
        rowsTitle: "Flagship titles by active cases",
        rows: titles.slice(0, 5).map(({ a, n, critical }) => ({
          id: a.id,
          title: a.title,
          subtitle: `${a.author} · ${inr(a.indicativeValueInr)} per copy`,
          href: `/catalogue/${a.id}`,
          metric: `${n} cases`,
          badge: critical ? { label: `${critical} critical`, tone: "red" as const } : undefined,
        })),
        link: listLink(state, f, "flagship-title cases"),
        secondary: { href: "/catalogue", label: "Open the catalogue" },
      };
    }

    case "estimatedExposureCr": {
      const ranked = state.catalogue
        .map((a) => ({ a, n: active.filter((c) => c.assetId === a.id).length }))
        .filter((x) => x.n > 0)
        .sort((x, y) => y.n * y.a.indicativeValueInr - x.n * x.a.indicativeValueInr);
      const priciest = [...state.catalogue].sort((x, y) => y.indicativeValueInr - x.indicativeValueInr)[0];
      const priciestCases = active.filter((c) => c.assetId === priciest.id).length;
      const avgValue = Math.round(state.catalogue.reduce((s, a) => s + a.indicativeValueInr, 0) / Math.max(1, state.catalogue.length));
      const multiple = Math.round((priciest.indicativeValueInr / Math.max(1, avgValue)) * 10) / 10;
      const financial = state.financialEstimates[0];
      const exposureCr = financial ? Math.round((financial.valueInr / 10000000) * 10) / 10 : 0;
      return {
        insight: financial
          ? `₹${exposureCr} Cr indicative exposure (${financial.methodology}, ${financial.confidence} confidence). ${priciest.title} sells at ${inr(priciest.indicativeValueInr)}, ${multiple}× the catalogue average, ` +
            `so each copy lost on its ${priciestCases} active cases costs the most.`
          : `No financial estimate is available for this dataset. ${priciest.title} sells at ${inr(priciest.indicativeValueInr)}, the highest in the catalogue, so each copy lost on its ${priciestCases} active cases costs the most.`,
        rowsTitle: "Titles carrying the most revenue risk (active cases × price per copy)",
        rows: ranked.slice(0, 5).map(({ a, n }) => ({
          id: a.id,
          title: a.title,
          subtitle: `${a.author} · ${inr(a.indicativeValueInr)} per copy${a.priorityTitle ? " · flagship" : ""}`,
          href: `/catalogue/${a.id}`,
          metric: `${n} cases`,
        })),
        link: { href: "/catalogue", label: "Open the catalogue" },
        secondary: { href: "/analytics", label: "See the exposure methodology" },
      };
    }
  }
}
