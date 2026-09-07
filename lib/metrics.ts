/**
 * Executive KPI / KRI pack for S. Chand.
 * Numbers are internally consistent so charts, cards and narrative agree.
 *
 * KPI = operating performance. KRI = residual risk.
 * All figures are labelled synthetic / demonstration.
 */

import { llmProbeDataset } from "./llm-probe";

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

export function executiveOverview() {
  const k = EXEC_KPI;
  const platformCounts = [
    { name: "Telegram", value: 48, pct: pct(48, k.activeCases), color: "#8B1E3F", action: "Largest residual concentration — daily monitoring" },
    { name: "Google Drive", value: 29, pct: pct(29, k.activeCases), color: "#00338D", action: "Folders reconstitute after folder-level takedown" },
    { name: "Websites", value: 24, pct: pct(24, k.activeCases), color: "#0077C8", action: "Intermediary notice + site-level evidence pack" },
    { name: "Marketplaces", value: 18, pct: pct(18, k.activeCases), color: "#D4A017", action: "Slowest consumer path — 3.4 day average removal" },
    { name: "Social Media", value: 13, pct: pct(13, k.activeCases), color: "#00A36C", action: "Standard platform IP form" },
    { name: "Cyberlockers", value: 10, pct: pct(10, k.activeCases), color: "#1A1F36", action: "Slowest host class — 4.1 days; escalate early" },
  ];
  const funnel = [
    { stage: "Detected", value: k.detected, insight: "OSINT + connector intake (12-week book)" },
    { stage: "Validated", value: k.validated, insight: `${pct(k.validated, k.detected)}% of detections survive human/AI validation` },
    { stage: "Case Created", value: k.caseCreated, insight: "Formal cases after evidence capture" },
    { stage: "Notice Sent", value: k.noticesSent, insight: "Legal-approved simulated submissions" },
    { stage: "Removed", value: k.removed, insight: `${k.takedownRate}% takedown = ${k.removed}/${k.noticesSent} notices` },
    { stage: "Closed", value: k.closed, insight: `Active book ${k.activeCases} = ${k.caseCreated} created − ${k.closed} closed` },
  ];
  const riskDist = [
    { name: "Critical", value: k.critical, pct: pct(k.critical, k.activeCases), color: "#DC2626", action: "Management attention — flagship titles still live" },
    { name: "High", value: k.high, pct: pct(k.high, k.activeCases), color: "#D4A017", action: "Escalate if SLA is approaching or breached" },
    { name: "Medium", value: k.medium, pct: pct(k.medium, k.activeCases), color: "#0077C8", action: "Standard investigator queue" },
    { name: "Low", value: k.low, pct: pct(k.low, k.activeCases), color: "#00A36C", action: "Monitor; do not pull capacity from Critical/High" },
  ];
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
  const removalByPlatform = [
    { name: "Telegram", days: 1.6, vsBlend: "faster", action: "Fastest path — keep notice templates current" },
    { name: "Google Drive", days: 1.9, vsBlend: "faster", action: "Watch for reconstituted folders after removal" },
    { name: "Websites", days: 2.4, vsBlend: "slower", action: "Slightly above blend; evidence packs must be complete" },
    { name: "Social Media", days: 2.6, vsBlend: "slower", action: "Above blend — follow up if SLA approaches" },
    { name: "Marketplaces", days: 3.4, vsBlend: "slower", action: "Pulls the mean up — India intermediary notices" },
    { name: "Cyberlockers", days: 4.1, vsBlend: "slower", action: "Slowest host class — escalate rather than wait" },
  ];
  const weightedRemoval =
    (1.6 * 48 + 1.9 * 29 + 2.4 * 24 + 2.6 * 13 + 3.4 * 18 + 4.1 * 10) / k.activeCases;

  return {
    kpis: {
      activeCases: k.activeCases,
      criticalHigh: k.criticalHigh,
      takedownRate: k.takedownRate,
      avgRemovalDays: k.avgRemovalDays,
      slaBreachRate: k.slaBreachRate,
      reappearanceRate: k.reappearanceRate,
      priorityTitleExposure: k.priorityTitleExposure,
      estimatedExposureCr: k.estimatedExposureCr,
      closedLoopRecoveryRate: k.closedLoopRecoveryRate,
      avgDetectReappearanceDays: k.avgDetectReappearanceDays,
      avgResurfaceDays: k.avgResurfaceDays,
    },
    trend,
    platformCounts,
    funnel,
    riskDist,
    flagship: [
      { name: "Flagship / priority", value: k.priorityCases, pct: k.priorityTitleExposure, color: "#8B1E3F", action: "Aggarwal, Lakhmir Singh, Wren & Martin, NEET — hold investigator capacity here" },
      { name: "Non-flagship", value: k.nonPriorityCases, pct: 100 - k.priorityTitleExposure, color: "#00338D", action: "Do not pull staff from priority titles to clear this queue" },
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
    emerging: [
      { title: "Telegram redistribution", detail: "48 of 142 active cases (34%) sit on Telegram — the largest single KRI concentration." },
      { title: "Google Drive mirrors", detail: "29 Drive cases; average removal 1.9 days, but folders reconstitute after takedown." },
      { title: "Exam-season PDF sharing", detail: "W12 exposure index 118 vs W11 100 — an 18% week-on-week rise into board exams." },
      { title: "Marketplace counterfeit listings", detail: "18 marketplace cases; slowest consumer path at 3.4 days average removal." },
      { title: "Unauthorized AI content repositories", detail: "LLM probing: 483 high-severity labels across two drives (430 elicitation + 53 forensic). 64 reconstructions scored ≥70 similarity. See LLM Exposure." },
    ],
    alerts: [
      { level: "CRITICAL", text: `${k.critical} critical priority-title cases require management attention.` },
      { level: "HIGH", text: `${k.slaBreachCount} SLA breaches (${k.slaBreachRate}% of the 142-case book) require escalation.` },
      { level: "EMERGING", text: `Piracy exposure index rose ${k.wowExposurePct}% in the latest 7-day period (W11 → W12).` },
    ],
    insights: {
      mixCheck: `Platform mix sums to ${platformCounts.reduce((a, p) => a + p.value, 0)} = active cases.`,
      riskCheck: `Risk mix ${k.critical}+${k.high}+${k.medium}+${k.low} = ${k.activeCases}. Critical+High ${k.criticalHigh} is ${pct(k.criticalHigh, k.activeCases)}% of the book (KRI).`,
      takedownCheck: `Takedown ${k.takedownRate}% = ${k.removed} removed / ${k.noticesSent} notices sent.`,
      slaCheck: `SLA KRI ${k.slaBreachRate}% = ${k.slaBreachCount} breached / 139 in-cycle cases (${k.slaApproaching} approaching, ${k.slaWithin} within).`,
      reappCheck: `Reappearance KRI ${k.reappearanceRate}% = ${k.reappearances} linked events / ${k.monitored} monitored cases.`,
      priorityCheck: `Priority-title exposure ${k.priorityTitleExposure}% = ${k.priorityCases}/${k.activeCases} active cases.`,
      financialCheck: `₹${k.estimatedExposureCr} Cr = ${k.unauthorizedCopies.toLocaleString("en-IN")} copies × ₹${k.indicativeValueInr} (Financial Exposure v0.1).`,
      removalCheck: `Blended removal time ${weightedRemoval.toFixed(1)} days, reported as ${k.avgRemovalDays} days.`,
      trendCheck: `W12 exposure index 118 vs W11 100 = +${k.wowExposurePct}% into board exams. Weekly new cases doubled from 9 (W1) to 19 (W12); the index is accelerating faster than case intake.`,
      platformInsight: `Telegram holds 48 of ${k.activeCases} cases (${pct(48, k.activeCases)}%) — the dominant distribution KRI. Google Drive 29 (${pct(29, k.activeCases)}%) reconstitutes after folder takedown.`,
      funnelInsight: `${pct(k.validated, k.detected)}% of detections validate. Once a notice is sent, takedown is ${k.takedownRate}% (${k.removed}/${k.noticesSent}). Active book ${k.activeCases} = ${k.caseCreated} created − ${k.closed} closed.`,
      flagshipInsight: `${k.priorityCases} of ${k.activeCases} active cases (${k.priorityTitleExposure}%) sit on priority titles. Concentrate investigator capacity on Aggarwal, Lakhmir Singh, Wren & Martin and NEET.`,
      removalInsight: `Blended ${k.avgRemovalDays} days. Telegram 1.6d is fastest; marketplaces 3.4d and cyberlockers 4.1d pull the mean up and should be escalated earlier.`,
      reappInsight: `Reappearance KRI ${k.reappearanceRate}% = ${k.reappearances} linked events / ${k.monitored} monitored. Weekly count rose from 1 (W1) to 3 (W12). Closed-loop recovery ${k.closedLoopRecoveryRate}%.`,
      geoInsight: `North + West India = 56% of geographic share. UAE/GCC 9% aligns with Telegram hosting patterns — treat as the same distribution ring, not a separate market.`,
    },
    recurringThreat: k.reappearances,
    synthetic: true as const,
    kri: {
      residualRiskShare: pct(k.criticalHigh, k.activeCases),
      riskInsight: `Critical+High ${k.criticalHigh} of ${k.activeCases} active cases (${pct(k.criticalHigh, k.activeCases)}%) is the residual-risk KRI. Medium ${k.medium} (${pct(k.medium, k.activeCases)}%) is the operating bulk. Low ${k.low} are contained.`,
      slaHeadroomHoursCritical: 24,
      examSeasonUpliftPct: k.wowExposurePct,
    },
  };
}

export function buildReport(type: string) {
  const ov = executiveOverview();
  const k = ov.kpis;
  const llm = type === "LLM Exposure Report" || type === "AI Governance Report" ? llmReportCharts() : null;
  const common = { type, generatedAt: new Date().toISOString(), overview: ov, synthetic: true, llm };
  const boards: Record<string, { title: string; sections: { heading: string; body: string }[]; charts: { title: string; kind: string; dataKey: string; hint?: string }[] }> = {
    "Executive Anti-Piracy Report": {
      title: "Executive Anti-Piracy Report",
      charts: [
        { title: "Exposure index vs weekly cases", kind: "line", dataKey: "trend" },
        { title: "Enforcement funnel", kind: "funnel", dataKey: "funnel" },
        { title: "Risk mix of the 142-case book", kind: "pie", dataKey: "riskDist", hint: ov.kri.riskInsight },
      ],
      sections: [
        { heading: "Executive Summary", body: `S. Chand is running a closed-loop IP operating model. KPI: ${k.activeCases} active cases, ${k.takedownRate}% takedown (${EXEC_KPI.removed}/${EXEC_KPI.noticesSent} notices), ${k.avgRemovalDays}-day average removal. KRI: ${k.criticalHigh} critical/high (${ov.kri.residualRiskShare}% of book), SLA breach ${k.slaBreachRate}%, reappearance ${k.reappearanceRate}%, priority-title exposure ${k.priorityTitleExposure}%.` },
        { heading: "Threat Landscape", body: ov.insights.mixCheck + " Telegram is 34% of residual cases — the dominant distribution KRI. Exam-season W12 index is 18% above W11." },
        { heading: "Exposure", body: ov.insights.financialCheck + " Medium confidence. Illustrative, not a statutory loss figure." },
        { heading: "Priority Titles", body: ov.insights.priorityCheck + " Flagship K-12 and test-prep titles (R.S. Aggarwal, Lakhmir Singh, Wren & Martin, NEET) remain the management focus." },
        { heading: "Enforcement Performance", body: ov.insights.takedownCheck + " " + ov.insights.removalCheck },
        { heading: "Reappearance", body: ov.insights.reappCheck + ` Closed-loop recovery ${k.closedLoopRecoveryRate}% — ${EXEC_KPI.reappearances} of ${EXEC_KPI.reappearances} detected events were linked to a prior case. Average resurfacing ${k.avgResurfaceDays} days.` },
        { heading: "Key Decisions Required", body: `1) Clear the ${EXEC_KPI.critical} critical flagship cases. 2) Escalate ${EXEC_KPI.slaBreachCount} SLA-breached matters. 3) Authorise exam-season surge staffing through board exams.` },
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
        { heading: "SLA", body: ov.insights.slaCheck + " Cyberlockers (4.1d) and marketplaces (3.4d) are the SLA KRI drivers versus Telegram at 1.6d." },
        { heading: "Next actions", body: `${EXEC_KPI.slaApproaching} cases are approaching SLA. Dispatcher should prioritise marketplace and cyberlocker queues.` },
      ],
    },
    "Investigator Productivity Report": {
      title: "Investigator Productivity Report",
      charts: [{ title: "Funnel conversion", kind: "funnel", dataKey: "funnel" }],
      sections: [
        { heading: "Throughput", body: `${EXEC_KPI.validated} of ${EXEC_KPI.detected} findings validated (${pct(EXEC_KPI.validated, EXEC_KPI.detected)}%). ${EXEC_KPI.caseCreated} cases created from validated stock.` },
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
        { heading: "Concentration KRI", body: ov.insights.mixCheck + " Telegram + Drive = 77/142 (54%) of residual exposure." },
        { heading: "Speed KPI", body: ov.insights.removalCheck + " Fastest: Telegram 1.6d. Slowest: cyberlockers 4.1d — twice the programme average." },
      ],
    },
    "Priority Title Exposure Report": {
      title: "Priority Title Exposure Report",
      charts: [{ title: "Flagship vs non-flagship", kind: "pie", dataKey: "flagship" }],
      sections: [
        { heading: "KRI", body: ov.insights.priorityCheck + ` All ${EXEC_KPI.critical} critical cases are priority titles.` },
        { heading: "Implication", body: "₹18.6 Cr exposure is weighted to flagship CBSE and test-prep SKUs. Daily monitoring cadence applies." },
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
        { heading: "Governance", body: `${EXEC_KPI.noticesSent} notices dispatched after four-gate validation and legal sign-off. ${EXEC_KPI.removed} platform removals recorded (simulated).` },
        { heading: "Holds", body: "Approved-hold cases remain blocked from submission until all four gates pass." },
      ],
    },
    "Financial Exposure Report": {
      title: "Financial Exposure Report",
      charts: [{ title: "Geographic share of exposure (%)", kind: "geo", dataKey: "geo" }],
      sections: [
        { heading: "Estimate", body: ov.insights.financialCheck },
        { heading: "Assumptions", body: "Unauthorized copies are an modelled distribution volume, not observed sales. Realization is catalogue indicative value, not net margin. Confidence: Medium. Methodology version FIN-v0.1." },
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
  return Math.round((n / d) * 100);
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
