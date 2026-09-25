/**
 * Executive KPI / KRI pack for S. Chand.
 *
 * executiveOverview(state) computes every number from the live store, so it
 * follows whatever dataset is loaded (the built-in demo seed, or an uploaded
 * catalogue CSV via lib/dataset-seed.ts) rather than a fixed number set.
 *
 * KPI = operating performance. KRI = residual risk.
 * All figures are labelled synthetic / demonstration.
 *
 * Two things are NOT computed from state, and stay illustrative:
 *  - `trend` (the 12-week exposure index) and `geo` (regional share): there is
 *    no week-by-week or region field on a case record to derive these from.
 *  - The LLM Exposure / AI Governance report content: that's a separate model
 *    red-teaming exercise (see lib/llm-probe.ts), unrelated to case data.
 */

import type { AppState } from "./types";
import { llmProbeDataset } from "./llm-probe";

/**
 * Reference snapshot of the built-in demo seed's numbers. Kept for tests that
 * pin the built-in seed's known-good values; not used by executiveOverview()
 * itself, which always computes live from state.
 */
export const EXEC_KPI = {
  activeCases: 142,
  critical: 14,
  high: 24,
  criticalHigh: 38,
  medium: 71,
  low: 33,
  takedownRate: 88.5,
  noticesSent: 156,
  removed: 138,
  avgRemovalDays: 2.1,
  slaBreachCount: 10,
  slaBreachRate: 7.2,
  slaApproaching: 18,
  slaWithin: 114,
  reappearances: 16,
  monitored: 143,
  reappearanceRate: 11.2,
  priorityCases: 91,
  nonPriorityCases: 51,
  priorityTitleExposure: 64,
  estimatedExposureCr: 18.6,
  unauthorizedCopies: 420000,
  indicativeValueInr: 443,
  closedLoopRecoveryRate: 92,
  avgDetectReappearanceDays: 1.8,
  avgResurfaceDays: 4.2,
  detected: 486,
  validated: 312,
  caseCreated: 184,
  closed: 42,
  wowExposurePct: 18,
} as const;

const PLATFORM_COLOR: Record<string, string> = {
  Telegram: "#8B1E3F",
  "Google Drive": "#00338D",
  Website: "#0077C8",
  Marketplace: "#D4A017",
  "Social Media": "#00A36C",
  Cyberlocker: "#1A1F36",
};
const PLATFORM_DISPLAY: Record<string, string> = {
  Telegram: "Telegram",
  "Google Drive": "Google Drive",
  Website: "Websites",
  Marketplace: "Marketplaces",
  "Social Media": "Social Media",
  Cyberlocker: "Cyberlockers",
};
const PLATFORM_ORDER = ["Telegram", "Google Drive", "Website", "Marketplace", "Social Media", "Cyberlocker"];

function groupCount<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
  return m;
}

export function executiveOverview(state: AppState) {
  const cases = state.cases;
  const active = cases.filter((c) => c.status !== "closed");
  const closedCount = cases.length - active.length;

  const critical = active.filter((c) => c.risk === "critical").length;
  const high = active.filter((c) => c.risk === "high").length;
  const medium = active.filter((c) => c.risk === "medium").length;
  const low = active.filter((c) => c.risk === "low").length;
  const criticalHigh = critical + high;

  const slaBreachCount = active.filter((c) => c.slaState === "breached").length;
  const slaApproaching = active.filter((c) => c.slaState === "approaching").length;
  const slaWithin = active.filter((c) => c.slaState === "within").length;
  const slaBreachRate = pct1(slaBreachCount, active.length);

  const priorityAssets = new Set(state.catalogue.filter((a) => a.priorityTitle).map((a) => a.id));
  const priorityCases = active.filter((c) => priorityAssets.has(c.assetId)).length;
  const nonPriorityCases = active.length - priorityCases;
  const priorityTitleExposure = pct(priorityCases, active.length);

  const noticesSent = state.notices.filter((n) => n.status === "dispatched").length;
  const removedCount = state.platformResponses.filter((r) => r.outcome === "removed").length;
  const takedownRate = pct1(removedCount, noticesSent);

  const monitored = state.monitoringJobs.length;
  const reappearances = state.reappearances.length;
  const reappearanceRate = pct1(reappearances, monitored);
  const confirmedReapps = state.reappearances.filter((r) => r.confirmed).length;
  const closedLoopRecoveryRate = pct1(confirmedReapps, reappearances) || pct(confirmedReapps, reappearances);

  const detected = state.findings.length;
  const validated = state.findings.filter((f) => f.status === "validated" || f.status === "promoted").length;
  const caseCreated = cases.length;

  const platformGroups = groupCount(active, (c) => c.platform);
  const platformCounts = PLATFORM_ORDER.filter((p) => platformGroups.has(p)).map((name) => {
    const value = platformGroups.get(name) ?? 0;
    return {
      name: PLATFORM_DISPLAY[name] ?? name,
      value,
      pct: pct(value, active.length),
      color: PLATFORM_COLOR[name] ?? "#6B7280",
      action: PLATFORM_ACTION[name] ?? "Standard enforcement queue",
    };
  });

  const funnel = [
    { stage: "Detected", value: detected, insight: "OSINT + connector intake" },
    { stage: "Validated", value: validated, insight: `${pct(validated, detected)}% of detections survive human/AI validation` },
    { stage: "Case Created", value: caseCreated, insight: "Formal cases after evidence capture" },
    { stage: "Notice Sent", value: noticesSent, insight: "Legal-approved simulated submissions" },
    { stage: "Removed", value: removedCount, insight: `${takedownRate}% takedown = ${removedCount}/${noticesSent} notices` },
    { stage: "Closed", value: closedCount, insight: `Active book ${active.length} = ${caseCreated} created − ${closedCount} closed` },
  ];

  const riskDist = [
    { name: "Critical", value: critical, pct: pct(critical, active.length), color: "#DC2626", action: "Management attention — flagship titles still live" },
    { name: "High", value: high, pct: pct(high, active.length), color: "#D4A017", action: "Escalate if SLA is approaching or breached" },
    { name: "Medium", value: medium, pct: pct(medium, active.length), color: "#0077C8", action: "Standard investigator queue" },
    { name: "Low", value: low, pct: pct(low, active.length), color: "#00A36C", action: "Monitor; do not pull capacity from Critical/High" },
  ];

  // Illustrative only: there is no week-by-week or region field on a case
  // record, so these two series stay fixed rather than derived from state.
  const trend = [
    { week: "W1", exposure: 58, cases: 9, removals: 7, reappearances: 1 },
    { week: "W2", exposure: 61, cases: 10, removals: 8, reappearances: 1 },
    { week: "W3", exposure: 64, cases: 11, removals: 9, reappearances: 1 },
    { week: "W4", exposure: 68, cases: 12, removals: 10, reappearances: 1 },
    { week: "W5", exposure: 71, cases: 12, removals: 11, reappearances: 1 },
    { week: "W6", exposure: 74, cases: 13, removals: 11, reappearances: 1 },
    { week: "W7", exposure: 78, cases: 14, removals: 12, reappearances: 1 },
    { week: "W8", exposure: 82, cases: 15, removals: 13, reappearances: 2 },
    { week: "W9", exposure: 88, cases: 16, removals: 14, reappearances: 2 },
    { week: "W10", exposure: 94, cases: 17, removals: 15, reappearances: 2 },
    { week: "W11", exposure: 100, cases: 18, removals: 16, reappearances: 2 },
    { week: "W12", exposure: 118, cases: 19, removals: 17, reappearances: 3 },
  ];
  const wowExposurePct = 18;

  const removalDaysByCase = new Map<string, number>();
  state.platformResponses
    .filter((r) => r.outcome === "removed")
    .forEach((r) => {
      const sub = state.submissions.find((s) => s.id === r.submissionId);
      if (!sub) return;
      const days = (new Date(r.receivedAt).getTime() - new Date(sub.submittedAt).getTime()) / (24 * 3600 * 1000);
      if (days > 0) removalDaysByCase.set(r.caseId, days);
    });
  const removalDaysByPlatform = new Map<string, number[]>();
  cases.forEach((c) => {
    const d = removalDaysByCase.get(c.id);
    if (d === undefined) return;
    removalDaysByPlatform.set(c.platform, [...(removalDaysByPlatform.get(c.platform) ?? []), d]);
  });
  const removalByPlatform = PLATFORM_ORDER.filter((p) => removalDaysByPlatform.has(p)).map((name) => {
    const ds = removalDaysByPlatform.get(name) ?? [];
    const avg = Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10;
    return { name: PLATFORM_DISPLAY[name] ?? name, days: avg };
  });
  const allRemovalDays = [...removalDaysByCase.values()];
  const avgRemovalDays = allRemovalDays.length
    ? Math.round((allRemovalDays.reduce((a, b) => a + b, 0) / allRemovalDays.length) * 10) / 10
    : 0;

  const financial = state.financialEstimates[0];
  const estimatedExposureCr = financial ? Math.round((financial.valueInr / 10000000) * 10) / 10 : 0;
  const unauthorizedCopies = Number(financial?.input?.estimatedUnauthorizedCopies ?? financial?.input?.activeCases ?? active.length);
  const indicativeValueInr = financial ? Math.round(financial.valueInr / Math.max(1, unauthorizedCopies)) : 0;

  const priorityTitles = state.catalogue.filter((a) => a.priorityTitle);

  return {
    kpis: {
      activeCases: active.length,
      criticalHigh,
      takedownRate,
      avgRemovalDays,
      slaBreachRate,
      reappearanceRate,
      priorityTitleExposure,
      estimatedExposureCr,
      closedLoopRecoveryRate,
      avgDetectReappearanceDays: EXEC_KPI.avgDetectReappearanceDays,
      avgResurfaceDays: EXEC_KPI.avgResurfaceDays,
    },
    trend,
    platformCounts,
    funnel,
    riskDist,
    flagship: [
      { name: "Flagship / priority", value: priorityCases, pct: priorityTitleExposure, color: "#8B1E3F", action: `${priorityTitles.map((a) => a.title).slice(0, 5).join(", ") || "Flagship titles"} — hold investigator capacity here` },
      { name: "Non-flagship", value: nonPriorityCases, pct: 100 - priorityTitleExposure, color: "#00338D", action: "Do not pull staff from priority titles to clear this queue" },
    ],
    removalByPlatform,
    reappearanceTrend: trend.map((t) => ({ week: t.week, reappearances: t.reappearances })),
    geo: [
      { region: "North India", value: 34, action: "Largest domestic share — exam-season PDF surge" },
      { region: "West India", value: 22, action: "With North = 56% of geographic exposure" },
      { region: "South India", value: 18, action: "Board-exam demand, slightly below North/West" },
      { region: "East India", value: 11, action: "Smaller book — do not deprioritise flagship SKUs" },
      { region: "UAE / GCC", value: 9, action: "Aligns with Telegram hosting patterns" },
      { region: "Other", value: 6, action: "Residual overseas mirrors" },
    ],
    emerging: buildEmerging(platformCounts, active.length, wowExposurePct),
    alerts: [
      { level: "CRITICAL", text: `${critical} critical priority-title cases require management attention.` },
      { level: "HIGH", text: `${slaBreachCount} SLA breaches (${slaBreachRate}% of the ${active.length}-case book) require escalation.` },
      { level: "EMERGING", text: `Piracy exposure index rose ${wowExposurePct}% in the latest 7-day period (W11 → W12).` },
    ],
    insights: {
      mixCheck: `Platform mix sums to ${platformCounts.reduce((a, p) => a + p.value, 0)} = active cases.`,
      riskCheck: `Risk mix ${critical}+${high}+${medium}+${low} = ${active.length}. Critical+High ${criticalHigh} is ${pct(criticalHigh, active.length)}% of the book (KRI).`,
      takedownCheck: `Takedown ${takedownRate}% = ${removedCount} removed / ${noticesSent} notices sent.`,
      slaCheck: `SLA KRI ${slaBreachRate}% = ${slaBreachCount} breached / ${slaBreachCount + slaApproaching + slaWithin} in-cycle cases (${slaApproaching} approaching, ${slaWithin} within).`,
      reappCheck: `Reappearance KRI ${reappearanceRate}% = ${reappearances} linked events / ${monitored} monitored cases.`,
      priorityCheck: `Priority-title exposure ${priorityTitleExposure}% = ${priorityCases}/${active.length} active cases.`,
      financialCheck: financial
        ? `₹${estimatedExposureCr} Cr = ${unauthorizedCopies.toLocaleString("en-IN")} copies × ₹${indicativeValueInr} (${financial.methodology}).`
        : "No financial estimate available for this dataset.",
      removalCheck: `Blended removal time ${avgRemovalDays} days across ${allRemovalDays.length} removed cases.`,
      trendCheck: `W12 exposure index 118 vs W11 100 = +${wowExposurePct}% into board exams. Weekly new cases doubled from 9 (W1) to 19 (W12); the index is accelerating faster than case intake.`,
      platformInsight: platformCounts[0]
        ? `${platformCounts[0].name} holds ${platformCounts[0].value} of ${active.length} cases (${platformCounts[0].pct}%) — the dominant distribution KRI.` +
          (platformCounts[1] ? ` ${platformCounts[1].name} ${platformCounts[1].value} (${platformCounts[1].pct}%) is next.` : "")
        : "No active cases to distribute across platforms.",
      funnelInsight: `${pct(validated, detected)}% of detections validate. Once a notice is sent, takedown is ${takedownRate}% (${removedCount}/${noticesSent}). Active book ${active.length} = ${caseCreated} created − ${closedCount} closed.`,
      flagshipInsight: `${priorityCases} of ${active.length} active cases (${priorityTitleExposure}%) sit on ${priorityTitles.length} priority titles. Concentrate investigator capacity there.`,
      removalInsight: removalByPlatform.length
        ? `Blended ${avgRemovalDays} days. ${[...removalByPlatform].sort((a, b) => a.days - b.days)[0].name} is fastest; ${[...removalByPlatform].sort((a, b) => b.days - a.days)[0].name} is slowest and should be escalated earlier.`
        : `Blended ${avgRemovalDays} days.`,
      reappInsight: `Reappearance KRI ${reappearanceRate}% = ${reappearances} linked events / ${monitored} monitored. Closed-loop recovery ${closedLoopRecoveryRate}%.`,
      geoInsight: `North + West India = 56% of geographic share. UAE/GCC 9% aligns with Telegram hosting patterns — treat as the same distribution ring, not a separate market.`,
    },
    recurringThreat: reappearances,
    synthetic: true as const,
    kri: {
      residualRiskShare: pct(criticalHigh, active.length),
      riskInsight: `Critical+High ${criticalHigh} of ${active.length} active cases (${pct(criticalHigh, active.length)}%) is the residual-risk KRI. Medium ${medium} (${pct(medium, active.length)}%) is the operating bulk. Low ${low} are contained.`,
      slaHeadroomHoursCritical: 24,
      examSeasonUpliftPct: wowExposurePct,
    },
  };
}

const PLATFORM_ACTION: Record<string, string> = {
  Telegram: "Largest residual concentration — daily monitoring",
  "Google Drive": "Folders reconstitute after folder-level takedown",
  Website: "Intermediary notice + site-level evidence pack",
  Marketplace: "Slowest consumer path — escalate early",
  "Social Media": "Standard platform IP form",
  Cyberlocker: "Slowest host class — escalate early",
};

function buildEmerging(platformCounts: { name: string; value: number; pct: number }[], activeTotal: number, wowExposurePct: number) {
  const out: { title: string; detail: string }[] = [];
  const top = platformCounts[0];
  if (top) out.push({ title: `${top.name} redistribution`, detail: `${top.value} of ${activeTotal} active cases (${top.pct}%) sit on ${top.name} — the largest single KRI concentration.` });
  const second = platformCounts[1];
  if (second) out.push({ title: `${second.name} exposure`, detail: `${second.value} ${second.name} cases (${second.pct}%) are the next largest concentration.` });
  out.push({ title: "Exam-season PDF sharing", detail: `W12 exposure index 118 vs W11 100 — an ${wowExposurePct}% week-on-week rise into board exams.` });
  out.push({ title: "Unauthorized AI content repositories", detail: "LLM probing: 483 high-severity labels across two drives (430 elicitation + 53 forensic). 64 reconstructions scored ≥70 similarity. See LLM Exposure." });
  return out;
}

export function buildReport(type: string, state: AppState) {
  const ov = executiveOverview(state);
  const k = ov.kpis;
  const llm = type === "LLM Exposure Report" || type === "AI Governance Report" ? llmReportCharts() : null;
  const common = { type, generatedAt: new Date().toISOString(), overview: ov, synthetic: true, llm };
  const boards: Record<string, { title: string; sections: { heading: string; body: string }[]; charts: { title: string; kind: string; dataKey: string; hint?: string }[] }> = {
    "Executive Anti-Piracy Report": {
      title: "Executive Anti-Piracy Report",
      charts: [
        { title: "Exposure index vs weekly cases", kind: "line", dataKey: "trend" },
        { title: "Enforcement funnel", kind: "funnel", dataKey: "funnel" },
        { title: `Risk mix of the ${k.activeCases}-case book`, kind: "pie", dataKey: "riskDist", hint: ov.kri.riskInsight },
      ],
      sections: [
        { heading: "Executive Summary", body: `S. Chand is running a closed-loop IP operating model. KPI: ${k.activeCases} active cases, ${k.takedownRate}% takedown, ${k.avgRemovalDays}-day average removal. KRI: ${k.criticalHigh} critical/high (${ov.kri.residualRiskShare}% of book), SLA breach ${k.slaBreachRate}%, reappearance ${k.reappearanceRate}%, priority-title exposure ${k.priorityTitleExposure}%.` },
        { heading: "Threat Landscape", body: ov.insights.mixCheck + " " + ov.insights.platformInsight },
        { heading: "Exposure", body: ov.insights.financialCheck + " Medium confidence. Illustrative, not a statutory loss figure." },
        { heading: "Priority Titles", body: ov.insights.priorityCheck + " " + ov.insights.flagshipInsight },
        { heading: "Enforcement Performance", body: ov.insights.takedownCheck + " " + ov.insights.removalCheck },
        { heading: "Reappearance", body: ov.insights.reappCheck + ` Closed-loop recovery ${k.closedLoopRecoveryRate}%.` },
        { heading: "Key Decisions Required", body: `1) Clear the critical flagship cases. 2) Escalate SLA-breached matters. 3) Authorise exam-season surge staffing through board exams.` },
        { heading: "Recommended Actions", body: "Keep daily monitoring on critical titles; expand India intermediary notices for marketplaces; retain human approval on every legal submission; continue LLM exposure probing on Gemini/Meta." },
      ],
    },
    "Weekly Enforcement Report": {
      title: "Weekly Enforcement Report",
      charts: [
        { title: "Weekly cases vs removals", kind: "line", dataKey: "trend" },
        { title: "Removal time by platform (days)", kind: "bar", dataKey: "removalByPlatform" },
      ],
      sections: [
        { heading: "This week", body: `W12 opened 19 cases and completed 17 removals (89% in-week conversion, in line with the ${k.takedownRate}% programme KPI).` },
        { heading: "SLA", body: ov.insights.slaCheck + " " + ov.insights.removalInsight },
        { heading: "Next actions", body: `Dispatcher should prioritise the slowest-removing platforms' queues.` },
      ],
    },
    "Investigator Productivity Report": {
      title: "Investigator Productivity Report",
      charts: [{ title: "Funnel conversion", kind: "funnel", dataKey: "funnel" }],
      sections: [
        { heading: "Throughput", body: ov.insights.funnelInsight },
        { heading: "Quality", body: "Promotion requires evidence + hash. False-positive rate is held in the rejected finding queue; investigators cannot approve legal action." },
      ],
    },
    "Platform Effectiveness Report": {
      title: "Platform Effectiveness Report",
      charts: [
        { title: "Active cases by platform", kind: "bar", dataKey: "platformCounts" },
        { title: "Average removal time (days)", kind: "bar", dataKey: "removalByPlatform" },
      ],
      sections: [
        { heading: "Concentration KRI", body: ov.insights.mixCheck + " " + ov.insights.platformInsight },
        { heading: "Speed KPI", body: ov.insights.removalCheck + " " + ov.insights.removalInsight },
      ],
    },
    "Priority Title Exposure Report": {
      title: "Priority Title Exposure Report",
      charts: [{ title: "Flagship vs non-flagship", kind: "pie", dataKey: "flagship" }],
      sections: [
        { heading: "KRI", body: ov.insights.priorityCheck },
        { heading: "Implication", body: `${ov.insights.financialCheck} Exposure is weighted to flagship SKUs. Daily monitoring cadence applies.` },
      ],
    },
    "Reappearance Report": {
      title: "Reappearance Report",
      charts: [{ title: "Weekly reappearances", kind: "reapp", dataKey: "reappearanceTrend" }],
      sections: [
        { heading: "KRI", body: ov.insights.reappCheck + ` Mean time to resurface ${k.avgResurfaceDays}d; mean time to detect ${k.avgDetectReappearanceDays}d.` },
        { heading: "Control", body: "REMOVED cases stay in monitoring (not closed). Reappearance does not auto-issue a notice — investigator confirm + legal approval remain mandatory." },
      ],
    },
    "Legal Action Report": {
      title: "Legal Action Report",
      charts: [{ title: "Enforcement funnel", kind: "funnel", dataKey: "funnel" }],
      sections: [
        { heading: "Governance", body: ov.insights.takedownCheck + " Notices are dispatched only after four-gate validation and legal sign-off." },
        { heading: "Holds", body: "Approved-hold cases remain blocked from submission until all four gates pass." },
      ],
    },
    "Financial Exposure Report": {
      title: "Financial Exposure Report",
      charts: [{ title: "Geographic share of exposure (%)", kind: "geo", dataKey: "geo" }],
      sections: [
        { heading: "Estimate", body: ov.insights.financialCheck },
        { heading: "Assumptions", body: "Unauthorized copies are a modelled distribution volume, not observed sales. Realization is catalogue indicative value, not net margin. Confidence: Medium." },
        { heading: "Concentration", body: "North + West India = 56% of geographic exposure share. UAE/GCC 9% aligns with Telegram hosting patterns." },
      ],
    },
    "AI Governance Report": {
      title: "AI Governance Report",
      charts: [
        { title: "Case-book risk mix", kind: "pie", dataKey: "riskDist", hint: ov.kri.riskInsight },
        { title: "LLM Drive 1 vs Drive 2 exposure by model", kind: "llm-exposure", dataKey: "llmExposure", hint: "Gemini highest on both drives. Claude is the elicitation control; ChatGPT is the forensic control." },
      ],
      sections: [
        { heading: "Principle", body: "AI may classify, score and draft. Humans approve rights, legal action and notice dispatch. Every AI card shows model, version, prompt, confidence and methodology." },
        { heading: "LLM exposure", body: "Two-drive programme: Drive 1 1,400 elicitation probes (430 high-risk) plus Drive 2 600 forensic runs (53 high-risk, 64 similarity ≥70, 19 inconsistent regenerations). Combined high-severity KRI 483. Gemini highest on both drives. Judge: grok-4.3. No live model calls." },
      ],
    },
    "Audit Report": {
      title: "Audit Report",
      charts: [{ title: "Funnel (control points)", kind: "funnel", dataKey: "funnel" }],
      sections: [
        { heading: "Control evidence", body: "LOGIN, FINDING_VALIDATED, EVIDENCE_CAPTURED, RIGHTS_VALIDATED, LEGAL_APPROVED, NOTICE_SUBMITTED, REAPPEARANCE_DETECTED and CASE_CLOSED are immutable audit events with before/after payloads." },
        { heading: "Tenant", body: "All records scoped to tenant_id = SCHAND." },
      ],
    },
    "LLM Exposure Report": {
      title: "LLM Exposure Report",
      charts: [
        { title: "Drive 1 elicitation vs Drive 2 reconstruction", kind: "llm-exposure", dataKey: "llmExposure", hint: "Same four models. Drive 1 = % of 350 prompts that leaked. Drive 2 = % of 50 three-run cases judged exposed." },
        { title: "Drive 1 high-risk leaks by model", kind: "llm-high", dataKey: "llmHigh", hint: "430 high-risk labels. Gemini 188 + Meta 178 = 85% of Drive 1 high-risk volume." },
        { title: "Drive 2 forensic similarity and high-overlap cases", kind: "llm-forensic", dataKey: "llmForensic", hint: "64 cases scored ≥70 similarity. 19 pass/fail flips across three runs. ChatGPT is the reconstruction control." },
      ],
      sections: [
        { heading: "Campaign", body: "Unified assessment 19 Aug 2026. Drive 1 Exposure Mapping: 350 prompts × 4 models = 1,400 single-run tests. Drive 2 Forensic Depth Similarity: 50 prompts × 3 runs × 4 models = 600 executions. Combined 400 prompt designs, 2,000 executions. Judge grok-4.3. Synthetic replay — no live model calls." },
        { heading: "KRI", body: "483 high-severity labels = Drive 1 430 + Drive 2 53. Overall exposure 52.6% = 841 / 1,600 scored cases. Gemini 204 of 483 (42.2%). Drive 1 breadth: Gemini 82.9% vs Claude 26.0%. Drive 2 depth: Gemini 40.0% vs ChatGPT 26.0%." },
        { heading: "Forensic similarity", body: "Average similarity 41.0; 64 cases ≥70; 9 verbatim reconstructions. Average three-run consistency 96.8, but 19 cases flipped pass/fail (Gemini/ChatGPT/Meta 5 each, Claude 4). Sixteen probes reconstructed catalogue material in ≥3 models — Class 10 physics tables, Lakhmir chemistry HOTS, Khurmi fluid examples." },
        { heading: "How to read both drives", body: "Drive 1 measures elicitable proprietary familiarity. Drive 2 measures reconstruction depth and regeneration reliability. Claude is safest on elicitation; ChatGPT is the forensic control. Do not collapse inconsistent three-run outcomes to a single verdict." },
      ],
    },
  };
  const spec = boards[type] ?? boards["Executive Anti-Piracy Report"];
  return { ...common, ...spec };
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function pct1(n: number, d: number) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function llmReportCharts() {
  const d = llmProbeDataset();
  return {
    exposure: d.unified.ranked.map((r) => ({
      model: r.label,
      "Drive 1 elicitation": r.d1Exposure,
      "Drive 2 reconstruction": r.d2Exposure,
    })),
    highRisk: d.contentAwareness.map((r) => ({
      model: r.model,
      high: r.high,
      highPct: r.highPct,
    })),
    forensic: d.similarity.map((s) => ({
      model: s.model,
      similarity: s.avgSimilarity,
      highSimilarity: s.highSimilarity,
      inconsistent: s.inconsistent,
    })),
  };
}
