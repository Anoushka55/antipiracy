import { describe, expect, it } from "vitest";
import { EXEC_KPI, executiveOverview, buildReport } from "@/lib/metrics";
import { llmProbeDataset } from "@/lib/llm-probe";

describe("executive KPI/KRI pack", () => {
  it("reconciles counts", () => {
    const k = EXEC_KPI;
    expect(k.critical + k.high).toBe(k.criticalHigh);
    expect(k.critical + k.high + k.medium + k.low).toBe(k.activeCases);
    expect(k.priorityCases + k.nonPriorityCases).toBe(k.activeCases);
    expect(k.caseCreated - k.closed).toBe(k.activeCases);
    expect(Math.round((k.removed / k.noticesSent) * 1000) / 10).toBe(k.takedownRate);
    expect(k.unauthorizedCopies * k.indicativeValueInr).toBe(186060000);
    expect(k.estimatedExposureCr).toBe(18.6);
  });

  it("charts sum to the case book", () => {
    const ov = executiveOverview();
    expect(ov.platformCounts.reduce((a, p) => a + p.value, 0)).toBe(EXEC_KPI.activeCases);
    expect(ov.geo.reduce((a, g) => a + g.value, 0)).toBe(100);
    expect(ov.flagship.reduce((a, f) => a + f.value, 0)).toBe(EXEC_KPI.activeCases);
    expect(ov.riskDist.reduce((a, r) => a + r.value, 0)).toBe(EXEC_KPI.activeCases);
    expect(ov.riskDist.map((r) => r.name)).toEqual(["Critical", "High", "Medium", "Low"]);
    expect(ov.kri.residualRiskShare).toBe(27);
  });
});

describe("LLM unified assessment (Drive 1 + Drive 2)", () => {
  it("reconciles high-severity and forensic counts", () => {
    const d = llmProbeDataset();
    const u = d.unified.kpis;
    expect(u.d1HighRisk + u.d2HighRisk).toBe(u.highSeverityFindings);
    expect(u.d1HighRisk + u.d2HighRisk).toBe(483);
    expect(u.promptsDrive1 + u.promptsDrive2).toBe(u.promptsTested);
    expect(u.totalExecutions).toBe(2000);
    expect(u.d2HighSimilarity).toBe(64);
    expect(u.d2Inconsistent).toBe(19);
    expect(d.unified.drive2.hotspots.length).toBe(16);
    expect(d.unified.drive2.inconsistentCases.length).toBe(19);
    expect(d.findings.filter((f) => f.suite === "similarity").length).toBeGreaterThan(50);
    const gemini = d.similarity.find((s) => s.model === "Gemini");
    const gpt = d.similarity.find((s) => s.model === "ChatGPT");
    expect(gemini?.avgSimilarity).toBe(44.6);
    expect(gpt?.exposureRate).toBe(26);
    expect(gemini?.highSimilarity).toBe(18);
  });
});

describe("LLM Exposure Report", () => {
  it("includes Drive 1 and Drive 2 charts", () => {
    const report = buildReport("LLM Exposure Report");
    expect(report.charts.length).toBeGreaterThanOrEqual(3);
    expect(report.charts.map((c) => c.kind)).toEqual(["llm-exposure", "llm-high", "llm-forensic"]);
    expect(report.llm?.exposure).toHaveLength(4);
    expect(report.llm?.highRisk.reduce((a, r) => a + r.high, 0)).toBe(430);
  });
});
