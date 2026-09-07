import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticate, createSession, getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { getStore, mutate, resetStore } from "@/lib/store";
import { CaseWorkflowService, verifyEvidenceHash, accessEvidence } from "@/lib/workflow";
import { computeOverview, searchAll } from "@/lib/analytics";
import {
  generateAdditionalFindings,
  runFullStory,
  seedDemoScenario,
  simulatePlatformResponses,
  startDiscoveryJob,
} from "@/lib/demo";
import { MockAIService } from "@/lib/ai";
import type { FourGates, SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function userOr401() {
  const user = await getCurrentUser();
  if (!user) return { user: null, res: err("Unauthenticated", 401) };
  return { user, res: null };
}

export async function GET(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url);
  const path = pathname.replace(/^\/api\/?/, "");

  if (path === "health") return json({ ok: true, env: "prototype" });

  const { user, res } = await userOr401();
  if (!user) return res;

  const state = getStore();
  const q = searchParams.get("q") ?? "";
  const id = searchParams.get("id");
  const tab = searchParams.get("tab");
  const view = searchParams.get("view");

  if (path === "me") return json({ user, tenant: state.tenant, demoMode: state.configuration.demoMode });

  if (path === "overview") return json(computeOverview(state));

  if (path === "search") return json(searchAll(state, q));

  if (path === "notifications") {
    const items = state.notifications.filter(
      (n) => n.audience === "all" || n.audience.includes(user.role)
    );
    return json({ items });
  }

  if (path === "findings") {
    let rows = state.findings.filter((f) => f.tenantId === user.tenantId);
    const seen = new Set<string>();
    rows = rows.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    if (tab === "new") rows = rows.filter((f) => f.status === "new");
    if (tab === "ai_flagged") rows = rows.filter((f) => f.status === "ai_flagged");
    if (tab === "priority") rows = rows.filter((f) => f.priority === "critical");
    if (tab === "needs_validation") rows = rows.filter((f) => f.status === "needs_validation");
    if (tab === "promoted") rows = rows.filter((f) => f.status === "promoted");
    if (tab === "rejected") rows = rows.filter((f) => f.status === "rejected");
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = 25;
    const start = (page - 1) * pageSize;
    return json({
      total: rows.length,
      newCount: state.findings.filter((f) => f.status === "new").length,
      items: rows.slice(start, start + pageSize),
    });
  }

  if (path === "finding" && id) {
    const finding = state.findings.find((f) => f.id === id);
    if (!finding) return err("Not found", 404);
    const asset = state.catalogue.find((a) => a.id === finding.assetId);
    const related = state.findings.filter((f) => f.relatedFindingIds.includes(id) || finding.relatedFindingIds.includes(f.id));
    const ai = state.aiAssessments.find((a) => a.subjectId === id) ?? MockAIService.classifyFinding(finding);
    const similarity = MockAIService.calculateSimilarity({
      title: finding.suspectedTitle,
      isbn: String(finding.metadata.isbnDetected ?? asset?.isbn ?? ""),
      ocr: finding.ocrSimilarity,
      visual: Math.max(70, finding.matchScore - 3),
      metadata: Math.min(99, finding.matchScore + 2),
      watermark: finding.watermarkDetected,
    });
    const evidence = state.evidence.filter((e) => e.findingId === id);
    const entity = state.entities.find((e) => e.id === finding.entityId);
    return json({ finding, asset, related, ai, similarity, evidence, entity });
  }

  if (path === "investigations") {
    return json({
      items: state.investigations.map((inv) => ({
        ...inv,
        finding: state.findings.find((f) => f.id === inv.findingId),
        case: state.cases.find((c) => c.id === inv.caseId),
      })),
    });
  }

  if (path === "cases") {
    let rows = state.cases.filter((c) => c.tenantId === user.tenantId);
    const status = searchParams.get("status");
    const risk = searchParams.get("risk");
    if (status) rows = rows.filter((c) => c.status === status);
    if (risk) rows = rows.filter((c) => c.risk === risk);
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter((c) => `${c.id} ${c.title} ${c.platform} ${c.uploader}`.toLowerCase().includes(s));
    }
    return json({ items: rows, view: view ?? "table" });
  }

  if (path === "case" && id) {
    const rec = state.cases.find((c) => c.id === id);
    if (!rec) return err("Not found", 404);
    return json({
      case: rec,
      finding: state.findings.find((f) => f.id === rec.findingId),
      investigation: state.investigations.find((i) => i.id === rec.investigationId),
      asset: state.catalogue.find((a) => a.id === rec.assetId),
      evidence: state.evidence.filter((e) => rec.evidenceIds.includes(e.id) || e.caseId === rec.id),
      custody: state.custodyEvents.filter((e) => rec.evidenceIds.includes(e.evidenceId) || e.evidenceId.startsWith("EV-")),
      rights: state.rightsValidations.filter((r) => r.caseId === rec.id),
      legal: state.legalReviews.find((l) => l.caseId === rec.id),
      notices: state.notices.filter((n) => n.caseId === rec.id),
      submissions: state.submissions.filter((s) => s.caseId === rec.id),
      responses: state.platformResponses.filter((p) => p.caseId === rec.id),
      monitoring: state.monitoringJobs.find((m) => m.caseId === rec.id),
      reappearances: state.reappearances.filter((r) => r.originalCaseId === rec.id),
      transitions: state.transitions.filter((t) => t.caseId === rec.id),
      entity: state.entities.find((e) => e.id === rec.entityId),
      ai: MockAIService.classifyFinding(state.findings.find((f) => f.id === rec.findingId) ?? {}),
      route: MockAIService.recommendNoticeRoute(rec.platform),
      owner: state.users.find((u) => u.id === rec.ownerId),
    });
  }

  if (path === "evidence") {
    return json({ items: state.evidence.filter((e) => e.tenantId === user.tenantId) });
  }

  if (path === "evidence-item" && id) {
    const ev = state.evidence.find((e) => e.id === id);
    if (!ev) return err("Not found", 404);
    mutate((s) => accessEvidence(s, id, user));
    return json({
      evidence: ev,
      custody: state.custodyEvents.filter((c) => c.evidenceId === id),
      case: state.cases.find((c) => c.id === ev.caseId),
    });
  }

  if (path === "enforcement") {
    return json({
      items: state.cases
        .filter((c) =>
          ["notice_ready", "submitted", "awaiting_response", "removed", "escalated", "monitoring"].includes(c.status)
        )
        .map((c) => ({
          ...c,
          submission: state.submissions.find((s) => s.id === c.submissionId),
          notice: state.notices.find((n) => n.id === c.noticeId),
        })),
    });
  }

  if (path === "radar") {
    return json({
      kpis: {
        monitored: state.monitoringJobs.filter((m) => m.status === "active").length,
        totalMonitored: state.monitoringJobs.length,
        reappearances: state.reappearances.length,
        repeatOffenders: state.entities.filter((e) => e.labels.includes("REPEAT OFFENDER")).length,
        avgTime: 4.2,
        rate: computeOverview(state).kpis.reappearanceRate,
        closedLoop: computeOverview(state).kpis.closedLoopRecoveryRate,
      },
      items: state.reappearances,
      monitoring: state.monitoringJobs,
      entities: state.entities,
      cases: state.cases.filter((c) => c.status === "monitoring" || c.reappearance),
    });
  }

  if (path === "catalogue") {
    if (id) {
      const asset = state.catalogue.find((a) => a.id === id);
      if (!asset) return err("Not found", 404);
      return json({
        asset,
        relatedCases: state.cases.filter((c) => c.assetId === id),
        findings: state.findings.filter((f) => f.assetId === id).slice(0, 20),
      });
    }
    return json({ items: state.catalogue });
  }

  if (path === "entities") {
    if (id) {
      const entity = state.entities.find((e) => e.id === id);
      if (!entity) return err("Not found", 404);
      return json({
        entity,
        relationships: state.entityRelationships.filter(
          (r) => r.fromEntityId === id || r.toEntityId === id
        ),
        cases: state.cases.filter((c) => c.entityId === id),
        nodes: state.entities,
      });
    }
    return json({ items: state.entities, relationships: state.entityRelationships });
  }

  if (path === "analytics") {
    return json({
      overview: computeOverview(state),
      forecast: MockAIService.forecastExposure(),
      financial: state.financialEstimates,
      ai: state.configuration.ai,
    });
  }

  if (path === "reports") {
    return json({
      types: [
        "Executive Anti-Piracy Report",
        "Weekly Enforcement Report",
        "Investigator Productivity Report",
        "Platform Effectiveness Report",
        "Priority Title Exposure Report",
        "Reappearance Report",
        "Legal Action Report",
        "Financial Exposure Report",
        "AI Governance Report",
        "Audit Report",
        "LLM Exposure Report",
      ],
    });
  }

  if (path === "report") {
    const { buildReport } = await import("@/lib/metrics");
    const type = searchParams.get("type") ?? "Executive Anti-Piracy Report";
    return json({ tenant: state.tenant, ...buildReport(type) });
  }

  if (path === "llm-probing") {
    const { llmProbeDataset } = await import("@/lib/llm-probe");
    const data = llmProbeDataset();
    const id = searchParams.get("id");
    if (id) {
      const finding = data.findings.find((f) => f.id === id);
      if (!finding) return err("Not found", 404);
      return json({ finding, campaign: data.campaign });
    }
    return json(data);
  }

  if (path === "configuration") return json({ configuration: state.configuration, users: state.users.map(({ passwordHash: _p, ...u }) => u) });

  if (path === "admin") {
    if (!can(user.role, "admin.users") && !can(user.role, "demo.controls")) return err("Forbidden", 403);
    return json({
      connectors: state.connectors,
      jobs: state.jobs.slice(0, 20),
      users: state.users.map(({ passwordHash: _p, ...u }) => u),
      configuration: state.configuration,
      health: {
        queueDepth: state.jobs.filter((j) => j.status === "queued").length,
        failed: state.jobs.filter((j) => j.status === "failed").length,
        avgMs: 612,
        storageGb: 2.4,
        aiCalls: state.aiAssessments.length,
      },
    });
  }

  if (path === "audit") {
    if (!can(user.role, "audit.view") && user.role !== "legal" && user.role !== "lead") {
      return json({ items: state.auditEvents.filter((a) => a.userId === user.id).slice(0, 100) });
    }
    return json({ items: state.auditEvents.slice(0, 200) });
  }

  if (path === "jobs") return json({ items: state.jobs });

  return err("Not found", 404);
}

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const path = pathname.replace(/^\/api\/?/, "");
  const body = await req.json().catch(() => ({}));

  if (path === "auth/login") {
    const session = authenticate(String(body.email ?? ""), String(body.password ?? ""));
    if (!session) return err("Invalid credentials", 401);
    const token = await createSession(session);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    mutate((s) => {
      s.auditEvents.unshift({
        id: `AUD-LOGIN-${Date.now()}`,
        tenantId: session.tenantId,
        timestamp: new Date().toISOString(),
        userId: session.id,
        userName: session.name,
        role: session.role,
        action: "LOGIN",
        entity: "Session",
        entityId: session.id,
        before: null,
        after: { role: session.role },
        ip: "127.0.0.1",
        sessionId: `sess-${session.id}`,
      });
    });
    return json({ user: session });
  }

  if (path === "auth/logout") {
    const current = await getCurrentUser();
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    if (current) {
      mutate((s) => {
        s.auditEvents.unshift({
          id: `AUD-LOGOUT-${Date.now()}`,
          tenantId: current.tenantId,
          timestamp: new Date().toISOString(),
          userId: current.id,
          userName: current.name,
          role: current.role,
          action: "LOGOUT",
          entity: "Session",
          entityId: current.id,
          before: null,
          after: null,
          ip: "127.0.0.1",
          sessionId: `sess-${current.id}`,
        });
      });
    }
    return json({ ok: true });
  }

  const { user, res } = await userOr401();
  if (!user) return res;

  try {
    const result = mutate((state) => dispatchAction(state, user, path, body));
    return json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    const status = message.startsWith("Forbidden") ? 403 : 400;
    return err(message, status);
  }
}

function dispatchAction(state: ReturnType<typeof getStore>, user: SessionUser, path: string, body: Record<string, unknown>) {
  const id = String(body.id ?? body.caseId ?? body.findingId ?? "");

  switch (path) {
    case "findings/validate":
      return CaseWorkflowService.validateFinding(state, String(body.findingId), user, body.decision === "rejected" ? "rejected" : "validated");
    case "findings/promote":
      return CaseWorkflowService.createCaseFromFinding(state, String(body.findingId), user);
    case "investigations/note":
      return CaseWorkflowService.addInvestigationNote(state, String(body.investigationId), String(body.note), user);
    case "cases/confirm":
      return CaseWorkflowService.confirmInfringement(
        state,
        String(body.caseId),
        user,
        (body.outcome as "confirmed" | "insufficient_evidence" | "false_positive") ?? "confirmed"
      );
    case "cases/rights":
      return CaseWorkflowService.approveRights(state, String(body.caseId), user, body.gates as FourGates | undefined);
    case "cases/legal":
      return CaseWorkflowService.approveLegal(state, String(body.caseId), user);
    case "cases/notice":
      return CaseWorkflowService.generateNotice(state, String(body.caseId), user, body.route as never);
    case "notices/update":
      return CaseWorkflowService.updateNotice(state, String(body.noticeId), body.patch as never, user);
    case "notices/approve":
      return CaseWorkflowService.approveNotice(state, String(body.noticeId), user);
    case "enforcement/submit":
      return CaseWorkflowService.submitNotice(state, String(body.caseId), user);
    case "enforcement/response":
      return CaseWorkflowService.recordResponse(state, String(body.caseId), user, (body.outcome as "removed") ?? "removed");
    case "cases/monitor":
      return CaseWorkflowService.startMonitoring(state, String(body.caseId), user);
    case "cases/reopen":
      return CaseWorkflowService.reopenCase(state, String(body.caseId), user, body.findingId ? String(body.findingId) : undefined);
    case "cases/close":
      return CaseWorkflowService.closeCase(state, String(body.caseId), user, String(body.reason ?? "Closed"));
    case "cases/escalate":
      return CaseWorkflowService.escalate(state, String(body.caseId), user, String(body.reason ?? "SLA breached"));
    case "cases/assign":
      return CaseWorkflowService.assignCase(state, String(body.caseId), String(body.ownerId), user);
    case "radar/simulate":
      return CaseWorkflowService.simulateReappearance(state, String(body.caseId ?? "SC-2026-0842"), user);
    case "radar/confirm":
      return CaseWorkflowService.confirmReappearance(state, String(body.reappearanceId), user);
    case "evidence/verify":
      return verifyEvidenceHash(state, String(body.evidenceId), user);
    case "discovery/run":
      return startDiscoveryJob(state, user);
    case "demo/reset":
      if (!can(user.role, "demo.controls")) throw new Error("Forbidden: demo.controls");
      resetStore();
      return { ok: true, reset: true };
    case "demo/seed":
      if (!can(user.role, "demo.controls")) throw new Error("Forbidden: demo.controls");
      seedDemoScenario(state);
      return { ok: true };
    case "demo/findings":
      return generateAdditionalFindings(state, user);
    case "demo/responses":
      return simulatePlatformResponses(state, user);
    case "demo/story":
      return runFullStory(state, user);
    case "configuration/update":
      if (!can(user.role, "config.edit")) throw new Error("Forbidden: config.edit");
      Object.assign(state.configuration, body.patch ?? {});
      state.auditEvents.unshift({
        id: `AUD-CFG-${Date.now()}`,
        tenantId: user.tenantId,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: "CONFIG_CHANGED",
        entity: "Configuration",
        entityId: user.tenantId,
        before: null,
        after: body.patch,
        ip: "127.0.0.1",
        sessionId: `sess-${user.id}`,
      });
      return { configuration: state.configuration };
    case "notifications/read":
      state.notifications.forEach((n) => {
        if (!id || n.id === id) n.read = true;
      });
      return { ok: true };
    default:
      throw new Error("Unknown action");
  }
}
