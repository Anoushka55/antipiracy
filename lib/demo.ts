import type { AppState, Job, SessionUser } from "./types";
import { CaseWorkflowService } from "./workflow";
import { runDiscoveryScan } from "./connectors";
import { nextSeq } from "./ids";
import { resetStore } from "./store";
import { buildSeed } from "./seed";

function job(type: Job["type"], message: string): Job {
  return {
    id: `JOB-${nextSeq()}`,
    tenantId: "SCHAND",
    type,
    status: "running",
    progress: 10,
    message,
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    logs: [message],
  };
}

export function startDiscoveryJob(state: AppState, user: SessionUser) {
  const j = job("discovery", "SIMULATED DISCOVERY RUN — scanning mock connectors");
  state.jobs.unshift(j);
  const urls = new Set(state.findings.map((f) => f.url));
  const result = runDiscoveryScan(urls);
  result.findings.forEach((f) => {
    f.jobId = j.id;
    state.findings.unshift(f);
  });
  j.status = "completed";
  j.progress = 100;
  j.completedAt = new Date().toISOString();
  j.message = "Discovery scan completed";
  j.result = {
    sourcesScanned: result.sourcesScanned,
    newFindings: result.newFindings,
    duplicatesRemoved: result.duplicatesRemoved,
    highConfidence: result.highConfidence,
    critical: result.critical,
    simulated: true,
  };
  j.logs.push(
    `Sources scanned: ${result.sourcesScanned}`,
    `New findings: ${result.newFindings}`,
    `Duplicates removed: ${result.duplicatesRemoved}`,
    `High-confidence matches: ${result.highConfidence}`,
    `Critical findings: ${result.critical}`
  );
  return { job: j, result: j.result };
}

export function seedDemoScenario(state: AppState) {
  const fresh = buildSeed();
  Object.keys(fresh).forEach((k) => {
    // @ts-expect-error index
    state[k] = fresh[k];
  });
  return { ok: true };
}

export function resetDemo() {
  return resetStore();
}

export function simulatePlatformResponses(state: AppState, user: SessionUser) {
  const awaiting = state.cases.filter((c) => c.status === "awaiting_response" || c.status === "submitted");
  const updated = awaiting.slice(0, 5).map((c) => CaseWorkflowService.recordResponse(state, c.id, user, "removed"));
  return { count: updated.length };
}

export function generateAdditionalFindings(state: AppState, user: SessionUser) {
  return startDiscoveryJob(state, user);
}

function resetSignatureForStory(state: AppState) {
  const caseId = "SC-2026-0842";
  state.cases = state.cases.filter((c) => c.id !== caseId);
  state.investigations = state.investigations.filter((i) => i.caseId !== caseId);
  state.rightsValidations = state.rightsValidations.filter((r) => r.caseId !== caseId);
  state.legalReviews = state.legalReviews.filter((l) => l.caseId !== caseId);
  state.notices = state.notices.filter((n) => n.caseId !== caseId);
  state.submissions = state.submissions.filter((s) => s.caseId !== caseId);
  state.platformResponses = state.platformResponses.filter((p) => p.caseId !== caseId);
  state.monitoringJobs = state.monitoringJobs.filter((m) => m.caseId !== caseId);
  state.reappearances = state.reappearances.filter((r) => r.originalCaseId !== caseId);
  state.transitions = state.transitions.filter((t) => t.caseId !== caseId);
  state.findings = state.findings.filter((f) => f.id !== "FND-2026-1148");
  state.evidence = state.evidence.filter((e) => e.caseId !== caseId && e.id !== "EV-1148-A");
  const finding = state.findings.find((f) => f.id === "FND-2026-1092");
  if (finding) {
    finding.status = "ai_flagged";
    finding.relatedCaseId = null;
  }
  state.demo.reappearanceSimulated = false;
  state.demo.storyStep = 0;
}

export function runFullStory(state: AppState, user: SessionUser) {
  resetSignatureForStory(state);
  const logs: string[] = [];
  const finding = state.findings.find((f) => f.id === "FND-2026-1092") ?? state.findings[0];
  logs.push(`1. Discovery — opened ${finding.id}`);

  CaseWorkflowService.validateFinding(state, finding.id, { ...user, role: "investigator" }, "validated");
  logs.push("2. Investigation — finding validated");

  const rec = CaseWorkflowService.createCaseFromFinding(state, finding.id, { ...user, role: "investigator" });
  logs.push(`3. Evidence — case ${rec.id} created`);

  CaseWorkflowService.confirmInfringement(state, rec.id, { ...user, role: "investigator" }, "confirmed");
  logs.push("4. Rights validation — infringement confirmed");

  const legalUser = { ...user, role: "legal" as const, id: "USR-LEG-01", name: "Legal Reviewer 01" };
  CaseWorkflowService.approveRights(state, rec.id, legalUser);
  logs.push("5. Rights — 4/4 gates passed");

  CaseWorkflowService.approveLegal(state, rec.id, legalUser);
  logs.push("6. Legal approval");

  const notice = CaseWorkflowService.generateNotice(state, rec.id, legalUser);
  CaseWorkflowService.approveNotice(state, notice.id, legalUser);
  logs.push("7. Notice generated and approved");

  const ops = { ...user, role: "operations" as const, id: "USR-OPS-01", name: "Platform Operations 01" };
  const sub = CaseWorkflowService.submitNotice(state, rec.id, ops);
  logs.push(`8. Simulated submission ${sub.ticketId}`);

  CaseWorkflowService.recordResponse(state, rec.id, ops, "removed");
  logs.push("9. Simulated removal + monitoring");

  const rea = CaseWorkflowService.simulateReappearance(state, rec.id, ops);
  logs.push(`10. Reappearance ${rea.finding.id} linked to ${rec.id}`);

  CaseWorkflowService.confirmReappearance(state, rea.reappearance.id, { ...user, role: "investigator" });
  CaseWorkflowService.reopenCase(state, rec.id, { ...user, role: "investigator" }, rea.finding.id);
  logs.push("11–14. Relationship confirmed, case reopened, new enforcement cycle");

  state.demo.storyStep = 14;
  return {
    logs,
    originalCase: rec.id,
    newFinding: rea.finding.id,
    ticketId: sub.ticketId,
    confidence: 97,
  };
}
