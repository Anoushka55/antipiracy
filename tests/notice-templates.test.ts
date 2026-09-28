import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/seed";
import { CaseWorkflowService } from "@/lib/workflow";
import { can } from "@/lib/rbac";
import { buildNoticeDocument, noticeToText, TEMPLATE_FOR_ROUTE, TODO_PATTERN } from "@/lib/notice-templates";
import type { AppState, NoticeRoute, SessionUser } from "@/lib/types";

const lead: SessionUser = {
  id: "USR-LEAD-01",
  tenantId: "SCHAND",
  name: "Mr. Murli",
  title: "Anti-Piracy Lead",
  email: "murli@schand.demo",
  role: "lead",
};

function withNoticeOnRoute(state: AppState, route: NoticeRoute) {
  const notice = state.notices.find((n) => n.caseId === "SC-2026-0842")!;
  return { ...notice, route };
}

describe("notice templates, built from S. Chand's sample drafts", () => {
  const ROUTES: NoticeRoute[] = ["us_dmca", "platform_ip_form", "india_intermediary", "escalated_legal", "registrar_hosting"];

  it("builds a document for every route, filled from the case record", () => {
    const state = buildSeed();
    for (const route of ROUTES) {
      const notice = withNoticeOnRoute(state, route);
      const doc = buildNoticeDocument(state, notice);
      expect(doc.subject, route).toContain("Mathematics for Class 10");
      expect(doc.subject, route).toContain("SC-2026-0842");
      expect(doc.templateId, route).toBe(TEMPLATE_FOR_ROUTE[route]);

      const text = noticeToText(doc);
      expect(text, route).toContain("9789352533145"); // ISBN
      expect(text, route).toContain("t.me/cbse_free_books/4401"); // URL
      expect(text, route).toContain("AcademicLeaks_IN"); // uploader
      expect(text, route).toContain("Mr. Murli");
      expect(text, route).toContain("Anti-Piracy Lead");
      expect(text, route).toContain("info@schandpublishing.com");
    }
  });

  it("carries each sample's distinctive statutory wording", () => {
    const state = buildSeed();
    const dmcaText = noticeToText(buildNoticeDocument(state, withNoticeOnRoute(state, "us_dmca")));
    expect(dmcaText).toContain("17 U.S.C. § 512(c)(3)");
    expect(dmcaText).toContain("under penalty of perjury");

    const intermediaryText = noticeToText(buildNoticeDocument(state, withNoticeOnRoute(state, "india_intermediary")));
    expect(intermediaryText).toContain("Copyright Act, 1957");
    expect(intermediaryText).toContain("Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021");

    const escalatedText = noticeToText(buildNoticeDocument(state, withNoticeOnRoute(state, "escalated_legal")));
    expect(escalatedText).toContain("expressly reserved");
    expect(escalatedText).toContain("Prior Enforcement");

    const reportingText = noticeToText(buildNoticeDocument(state, withNoticeOnRoute(state, "platform_ip_form")));
    expect(reportingText).toContain("good-faith belief");
  });

  it("marks facts the platform cannot supply for Legal to complete", () => {
    const state = buildSeed();
    const doc = buildNoticeDocument(state, withNoticeOnRoute(state, "escalated_legal"));
    expect(doc.openItems).toBeGreaterThan(0);
    const text = noticeToText(doc);
    const matches = text.match(TODO_PATTERN) ?? [];
    expect(matches.length).toBe(doc.openItems);
    expect(text).toContain("To be completed by Legal");
  });

  it("lets the Anti-Piracy Lead approve rights, legal action, and generate and approve a notice", () => {
    expect(can("lead", "rights.approve")).toBe(true);
    expect(can("lead", "legal.approve")).toBe(true);
    expect(can("lead", "notice.generate")).toBe(true);
    expect(can("lead", "notice.approve")).toBe(true);

    const state = buildSeed();
    // Drive a fresh case through rights -> legal -> notice as the Lead.
    const findingId = state.findings.find((f) => f.status === "validated")?.id
      ?? state.findings.find((f) => f.status === "ai_flagged")!.id;
    if (state.findings.find((f) => f.id === findingId)!.status === "ai_flagged") {
      CaseWorkflowService.validateFinding(state, findingId, { ...lead, role: "investigator" }, "validated");
    }
    const rec = CaseWorkflowService.createCaseFromFinding(state, findingId, { ...lead, role: "investigator" });
    expect(() => CaseWorkflowService.approveRights(state, rec.id, lead)).not.toThrow();
    expect(() => CaseWorkflowService.approveLegal(state, rec.id, lead)).not.toThrow();
    const notice = CaseWorkflowService.generateNotice(state, rec.id, lead);
    expect(notice.status).toBe("draft");
    expect(() => CaseWorkflowService.approveNotice(state, notice.id, lead)).not.toThrow();
    const approved = state.notices.find((n) => n.id === notice.id)!;
    expect(approved.status).toBe("approved");
    expect(approved.signature).toContain("Mr. Murli");
    expect(approved.signature).toContain("Anti-Piracy Lead");
  });

  it("redrafts the existing draft in place when the template is switched, instead of duplicating it", () => {
    const state = buildSeed();
    const findingId = state.findings.find((f) => f.status === "ai_flagged")!.id;
    CaseWorkflowService.validateFinding(state, findingId, { ...lead, role: "investigator" }, "validated");
    const rec = CaseWorkflowService.createCaseFromFinding(state, findingId, { ...lead, role: "investigator" });
    CaseWorkflowService.approveRights(state, rec.id, lead);
    CaseWorkflowService.approveLegal(state, rec.id, lead);

    const first = CaseWorkflowService.generateNotice(state, rec.id, lead, "us_dmca");
    const countAfterFirst = state.notices.length;
    const second = CaseWorkflowService.generateNotice(state, rec.id, lead, "india_intermediary");

    expect(second.id).toBe(first.id); // same draft, rewritten in place
    expect(second.route).toBe("india_intermediary");
    expect(state.notices.length).toBe(countAfterFirst); // no duplicate created
  });
});
