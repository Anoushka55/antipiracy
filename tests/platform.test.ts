import { describe, expect, it, beforeEach } from "vitest";
import { hashPassword, verifyPassword, evidenceHash, sha256 } from "@/lib/hash";
import { can, assertCan } from "@/lib/rbac";
import { allGatesPass, slaHoursFor, slaState, repeatOffenderScore, emptyGates, gatesPassed } from "@/lib/sla";
import { buildSeed } from "@/lib/seed";
import { CaseWorkflowService, verifyEvidenceHash } from "@/lib/workflow";
import { runFullStory } from "@/lib/demo";
import type { SessionUser } from "@/lib/types";

const inv: SessionUser = {
  id: "USR-INV-02",
  tenantId: "SCHAND",
  name: "Enforcement Analyst 02",
  title: "Enforcement Analyst",
  email: "inv02@schand.demo",
  role: "investigator",
};
const legal: SessionUser = { ...inv, id: "USR-LEG-01", role: "legal", name: "Legal Reviewer 01" };
const ops: SessionUser = { ...inv, id: "USR-OPS-01", role: "operations", name: "Ops" };
const exec: SessionUser = { ...inv, id: "USR-EXEC-01", role: "executive", name: "Sourabh" };

describe("RBAC", () => {
  it("allows investigator to investigate but not approve legal", () => {
    expect(can("investigator", "finding.investigate")).toBe(true);
    expect(can("investigator", "legal.approve")).toBe(false);
    expect(can("legal", "legal.approve")).toBe(true);
    expect(can("executive", "config.edit")).toBe(false);
    expect(can("admin", "config.edit")).toBe(true);
  });
  it("throws on forbidden actions", () => {
    expect(() => assertCan("investigator", "notice.submit")).toThrow();
  });
});

describe("evidence hashing", () => {
  it("is deterministic", () => {
    const a = evidenceHash({ id: "EV-1", sourceUrl: "https://x", capturedAt: "2026-01-01", type: "pdf_binary" });
    const b = evidenceHash({ id: "EV-1", sourceUrl: "https://x", capturedAt: "2026-01-01", type: "pdf_binary" });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(sha256("x")).not.toBe(a);
  });
  it("hashes demo passwords", () => {
    const h = hashPassword("Schand@2026");
    expect(verifyPassword("Schand@2026", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
});

describe("SLA", () => {
  it("uses configured hours", () => {
    const rules = [
      { risk: "critical" as const, hours: 24 },
      { risk: "high" as const, hours: 48 },
    ];
    expect(slaHoursFor("critical", rules)).toBe(24);
    expect(slaHoursFor("high", rules, 72)).toBe(72);
  });
  it("classifies breach", () => {
    const created = new Date(Date.now() - 50 * 3600 * 1000).toISOString();
    expect(slaState(created, 24)).toBe("breached");
    expect(slaState(new Date().toISOString(), 48)).toBe("within");
  });
});

describe("four-gate validation", () => {
  it("requires all four passes", () => {
    const g = emptyGates("pass");
    expect(allGatesPass(g)).toBe(true);
    g.authorization = "hold";
    expect(allGatesPass(g)).toBe(false);
    expect(gatesPassed(g)).toBe(3);
  });
});

describe("repeat offender score", () => {
  it("is deterministic", () => {
    const a = repeatOffenderScore({ previousCases: 12, reappearances: 5, platforms: 3, successfulRemovals: 9, avgTimeToReappearanceDays: 4.2 });
    const b = repeatOffenderScore({ previousCases: 12, reappearances: 5, platforms: 3, successfulRemovals: 9, avgTimeToReappearanceDays: 4.2 });
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(50);
  });
});

describe("tenant isolation", () => {
  it("seeds SCHAND only", () => {
    const s = buildSeed();
    expect(s.tenant.id).toBe("SCHAND");
    expect(s.cases.every((c) => c.tenantId === "SCHAND")).toBe(true);
    expect(s.findings.every((f) => f.tenantId === "SCHAND")).toBe(true);
    expect(s.catalogue.every((a) => a.tenantId === "SCHAND")).toBe(true);
  });
});

describe("seed integrity", () => {
  it("meets volume and relationship rules", () => {
    const s = buildSeed();
    expect(s.findings.length).toBeGreaterThanOrEqual(100);
    expect(s.cases.length).toBeGreaterThanOrEqual(40);
    expect(s.evidence.length).toBeGreaterThanOrEqual(25);
    expect(s.notices.length).toBeGreaterThanOrEqual(15);
    expect(s.escalations.length).toBeGreaterThanOrEqual(10);
    expect(s.reappearances.length).toBeGreaterThanOrEqual(15);
    expect(s.entities.length).toBeGreaterThanOrEqual(8);
    const closed = s.cases.filter((c) => c.status === "closed");
    closed.forEach((c) => {
      expect(s.notices.some((n) => n.caseId === c.id)).toBe(true);
    });
    const removed = s.cases.filter((c) => c.status === "removed" || c.status === "monitoring");
    removed.forEach((c) => {
      expect(s.platformResponses.some((p) => p.caseId === c.id) || c.id === "SC-2026-0842").toBe(true);
    });
    s.reappearances.forEach((r) => {
      expect(s.cases.some((c) => c.id === r.originalCaseId)).toBe(true);
    });
    const findingIds = s.findings.map((f) => f.id);
    expect(new Set(findingIds).size).toBe(findingIds.length);
    expect(findingIds).not.toContain("FND-2026-1148");
  });
});

describe("case workflow", () => {
  it("blocks investigator legal approval", () => {
    const s = buildSeed();
    expect(() => CaseWorkflowService.approveLegal(s, "SC-2026-0842", inv)).toThrow();
  });

  it("creates audit events on transitions", () => {
    const s = buildSeed();
    const before = s.auditEvents.length;
    const f = s.findings.find((x) => x.status === "new" && !x.relatedCaseId)!;
    CaseWorkflowService.createCaseFromFinding(s, f.id, inv);
    expect(s.auditEvents.length).toBeGreaterThan(before);
    expect(s.auditEvents.some((a) => a.action === "CASE_CREATED")).toBe(true);
    expect(s.auditEvents.some((a) => a.action === "STATUS_CHANGED")).toBe(true);
  });

  it("verify hash matches stored sha", () => {
    const s = buildSeed();
    const ev = s.evidence.find((e) => e.id === "EV-0842-A")!;
    const r = verifyEvidenceHash(s, ev.id, inv);
    expect(r.ok).toBe(true);
  });
});

describe("end-to-end demo loop", () => {
  it("runs discovery through reopen", () => {
    const s = buildSeed();
    const result = runFullStory(s, inv);
    expect(result.originalCase).toBe("SC-2026-0842");
    expect(result.newFinding).toBe("FND-2026-1148");
    const rec = s.cases.find((c) => c.id === "SC-2026-0842")!;
    expect(["investigating", "reopened"]).toContain(rec.status);
    expect(s.reappearances.some((r) => r.newFindingId === "FND-2026-1148")).toBe(true);
    expect(s.submissions.some((sub) => sub.ticketId === "TG-IP-72842")).toBe(true);
    expect(s.findings.some((f) => f.id === "FND-2026-1148")).toBe(true);
    expect(s.evidence.some((e) => e.id === "EV-1148-A")).toBe(true);
  });
});

describe("reappearance linking", () => {
  it("links to original case and does not auto-send notice", () => {
    const s = buildSeed();
    const rec = s.cases.find((c) => c.id === "SC-2026-0842")!;
    rec.status = "monitoring";
    const noticesBefore = s.notices.filter((n) => n.status === "dispatched").length;
    const r = CaseWorkflowService.simulateReappearance(s, rec.id, ops);
    expect(r.finding.relatedCaseId).toBe("SC-2026-0842");
    expect(r.reappearance.relationship).toBe("reappearance_of");
    expect(s.notices.filter((n) => n.status === "dispatched").length).toBe(noticesBefore);
    const again = CaseWorkflowService.simulateReappearance(s, rec.id, ops);
    expect(again.finding.id).toBe(r.finding.id);
    expect(s.findings.filter((f) => f.id === r.finding.id)).toHaveLength(1);
  });
});

describe("executive cannot mutate cases", () => {
  it("forbids promote", () => {
    const s = buildSeed();
    expect(() => CaseWorkflowService.createCaseFromFinding(s, "FND-2026-1093", exec)).toThrow();
  });
});
