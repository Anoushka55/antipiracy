import probeJson from "../data/llm-probe-extract.json";
import unifiedJson from "../data/llm-unified-assessment.json";

export interface LlmFinding {
  id: string;
  testCaseId: number;
  suite: "content_awareness" | "similarity";
  model: string;
  modelId: string;
  title: string;
  author: string;
  prompt: string;
  risk: string;
  verdict: string;
  confidence: number;
  reason: string;
  signals?: Record<string, boolean>;
  judge: string;
  latencySec?: number | null;
  similarityScore?: number | null;
  familiarity?: string | null;
  consistency?: string | null;
  passRate?: string | null;
  inconsistent?: boolean;
  runs?: string[];
}

function authorFromPrompt(prompt: string, fallback: string) {
  const m = prompt.match(/by\s+(.+?)\s+\.\s+[A-Z“"I]/);
  return m ? m[1].replace(/\s+/g, " ").trim() : fallback.replace(/\s+/g, " ");
}

const AUTHOR_FIX: Record<string, string> = {
  "Sociology, 8e": "C.N. Shankar Rao",
  "Statistics, 8e": "R.S.N. Pillai, Bagavathi",
  "Physics Book 10": "Lakhmir Singh, Manjit Kaur, P.S. Verma, V.K. Agarwal",
  "Physics Book 9": "Lakhmir Singh, Manjit Kaur, P.S. Verma, V.K. Agarwal",
  "Chemistry Book 10": "Lakhmir Singh, Manjit Kaur, P.S. Verma, V.K. Agarwal",
  "Chemistry Book 9": "Lakhmir Singh, Manjit Kaur, P.S. Verma, V.K. Agarwal",
  "Political Theory": "Eddy Asirvatham, K.K. Misra",
  "Thermal Engineering": "R.S. Khurmi, J.K. Gupta",
  "Theory of Machines": "R.S. Khurmi, J.K. Gupta",
  "Machine Design (34e)": "R.S. Khurmi, J.K. Gupta",
  "Saral Ankganit": "Dr. R.S. Aggarwal",
  "Mathematics X": "R.S. Aggarwal",
  "ISC Physics Vol 1": "P. Vivekanandan, D.K. Banerjee",
  "History of Medieval India": "V.D. Mahajan",
  "Sociology of Indian Society": "C.N. Shankar Rao",
  "Business Economics, 13e": "H.L. Ahuja",
  "ISC Commerce Class XI": "Dr C.B. Gupta",
  "Verbal & Non-Verbal Reasoning (Hindi)": "Dr. R.S. Aggarwal",
};

export function llmProbeDataset() {
  const ca = probeJson.contentAwareness.map((r) => ({
    model: r.Model,
    modelId: r["Model ID"],
    prompts: r.Prompts,
    pass: r.PASS,
    fail: r.FAIL,
    passPct: Math.round((r.PASS / r.Prompts) * 1000) / 10,
    high: r["High Risk"],
    medium: r["Medium Risk"],
    low: r["Low Risk"],
    highPct: Math.round((r["High Risk"] / r.Prompts) * 1000) / 10,
    latency: r["Avg Latency (s)"],
    tokens: r["Total Tokens"],
    costUsd: r["Est. Cost (USD)"],
  }));

  const d2Models = unifiedJson.drive2.models;
  const sim = d2Models.map((r) => ({
    model: r.model,
    modelId: r.modelId,
    prompts: r.prompts,
    apiCalls: r.executions,
    passed: r.prompts - r.exposed,
    failed: r.exposed,
    passPct: r.passRate,
    exposureRate: r.exposureRate,
    avgSimilarity: r.avgSimilarity,
    avgConfidence: r.avgConfidence,
    avgConsistency: r.avgConsistency,
    high: r.high,
    medium: r.medium,
    low: r.low,
    inconsistent: r.inconsistent,
    perfectlyConsistent: r.perfectlyConsistent,
    highSimilarity: r.highSimilarity,
    consistencyBands: r.consistencyBands,
    apiFailedRuns: r.apiFailedRuns,
  }));

  const caFindings: LlmFinding[] = probeJson.findings.map((f) => ({
    ...f,
    suite: f.suite as LlmFinding["suite"],
    author: AUTHOR_FIX[f.title] ?? authorFromPrompt(f.prompt, f.author),
  }));

  const d2Findings: LlmFinding[] = unifiedJson.findings.map((f) => ({
    ...f,
    suite: "similarity" as const,
  }));

  const findings = [...caFindings, ...d2Findings];

  const titles = probeJson.priorityTitles.map((t) => ({
    ...t,
    author: AUTHOR_FIX[t.title] ?? t.author,
    leakRate: Math.round((t.fail / t.probes) * 100),
  }));

  const totalPrompts = ca.reduce((a, r) => a + r.prompts, 0);
  const totalFail = ca.reduce((a, r) => a + r.fail, 0);
  const totalPass = ca.reduce((a, r) => a + r.pass, 0);
  const totalHigh = ca.reduce((a, r) => a + r.high, 0);
  const totalCost = Number((ca.reduce((a, r) => a + r.costUsd, 0) + probeJson.similarity.reduce((a, r) => a + r["Est. Cost (USD)"], 0)).toFixed(2));
  const u = unifiedJson.kpis;
  const geminiD1High = ca.find((r) => r.model === "Gemini")?.high ?? 0;
  const geminiD2High = d2Models.find((r) => r.model === "Gemini")?.high ?? 0;
  const geminiBothHigh = geminiD1High + geminiD2High;
  const d2HighShare = Math.round((geminiBothHigh / u.highSeverityFindings) * 1000) / 10;

  return {
    campaign: {
      ...probeJson.campaign,
      unifiedGenerated: unifiedJson.generated,
      title: unifiedJson.title,
      subtitle: unifiedJson.subtitle,
      method:
        "Unified client assessment (19 Aug 2026): Drive 1 Exposure Mapping (350 prompts × 4 models, 1,400 executions) plus Drive 2 Forensic Depth Similarity (50 prompts × 3 runs × 4 models, 600 executions). Synthetic replay — no live model calls.",
    },
    contentAwareness: ca,
    similarity: sim,
    findings,
    titles,
    unified: {
      generated: unifiedJson.generated,
      narrative: unifiedJson.narrative,
      keyFindings: unifiedJson.keyFindings,
      conclusions: unifiedJson.conclusions,
      kpis: u,
      comparison: unifiedJson.comparison,
      ranked: unifiedJson.ranked,
      dataQuality: unifiedJson.dataQuality,
      drive1Purpose: unifiedJson.drive1Purpose,
      drive2Purpose: unifiedJson.drive2Purpose,
      drive2: {
        title: unifiedJson.drive2.title,
        purpose: unifiedJson.drive2.purpose,
        runCount: unifiedJson.drive2.runCount,
        promptCount: unifiedJson.drive2.promptCount,
        executionCount: unifiedJson.drive2.executionCount,
        metrics: unifiedJson.drive2.metrics,
        distributions: unifiedJson.drive2.distributions,
        hotspots: unifiedJson.drive2.hotspots,
        inconsistentCases: unifiedJson.drive2.inconsistentCases,
      },
    },
    kpis: {
      probes: totalPrompts,
      pass: totalPass,
      fail: totalFail,
      passPct: Math.round((totalPass / totalPrompts) * 1000) / 10,
      high: totalHigh,
      highPct: Math.round((totalHigh / totalPrompts) * 1000) / 10,
      models: ca.length,
      simCalls: sim.reduce((a, r) => a + r.apiCalls, 0),
      costUsd: totalCost,
      worstModel: "Gemini",
      safestModel: "Claude",
      geminiHighShare: Math.round((188 / totalHigh) * 1000) / 10,
      unifiedPrompts: u.promptsTested,
      unifiedExecutions: u.totalExecutions,
      overallExposure: u.overallExposureRate,
      highSeverityBoth: u.highSeverityFindings,
      d2HighSimilarity: u.d2HighSimilarity,
      d2Inconsistent: u.d2Inconsistent,
      avgSimilarity: u.avgSimilarity,
      avgConsistency: u.avgConsistency,
      geminiBothShare: d2HighShare,
    },
    insights: [
      `Two complementary drives: Drive 1 Exposure Mapping (elicitation, 350 × 4 = 1,400) and Drive 2 Forensic Depth Similarity (reconstruction, 50 × 3 × 4 = 600). Combined: 400 prompt designs, 2,000 executions, overall exposure 52.6% = 841 exposed prompt/model cases / 1,600 scored cases.`,
      `High-severity KRI is 483 = Drive 1 430 + Drive 2 53. Gemini accounts for 204 of 483 (42.2%): 188 elicitation + 16 forensic.`,
      `Drive 1 separated models on breadth: Gemini 82.9% exposure vs Claude 26.0%. Drive 2 measured depth: Gemini still highest (40.0% exposure, 44.6 avg similarity, 18 cases ≥70) but ChatGPT is the forensic control (26.0% exposure, 37.0 similarity).`,
      `Claude is safest on elicitation, not on reconstruction. Drive 2 Claude exposure 32.0% matches Meta; 15 high-similarity cases including a 100-score source-and-sink reconstruction that flipped pass/fail across runs.`,
      `64 prompt/model cases scored ≥70 forensic similarity. Sixteen probes reconstructed catalogue material in ≥3 models — Class 10 physics tables (concave-mirror, AMBULANCE, David MCQ), Lakhmir chemistry HOTS, and Khurmi fluid-dynamics worked examples.`,
      `Repeated-run reliability is high but not uniform: avg consistency 96.8, yet 19 cases changed pass/fail across three independent runs (Gemini 5, ChatGPT 5, Meta 5, Claude 4). Those must not be collapsed to a single verdict.`,
      `Forensic indicators on 200 Drive 2 cases: structural 98, proprietary details 79, reconstruction 71, paraphrase 65, consistent regeneration 60, near-verbatim 44, verbatim 9.`,
      `High-risk Drive 1 titles remain Lakhmir Singh science, R.S. Khurmi engineering, R.S. Aggarwal quantitative and C.N. Shankar Rao sociology — the same flagship SKUs Drive 2 reconstructs as worked examples and tables.`,
    ],
  };
}
