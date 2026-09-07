import type {
  AppState,
  CaseRecord,
  CaseStatus,
  Evidence,
  Finding,
  FourGates,
  Notice,
  NoticeRoute,
  Role,
  SessionUser,
} from "./types";
import { assertCan, type Permission } from "./rbac";
import { TENANT_ID, TOOL_VERSION } from "./constants";
import { evidenceHash } from "./hash";
import { nextSeq } from "./ids";
import { allGatesPass, emptyGates, repeatOffenderScore, slaDueAt, slaHoursFor, slaState } from "./sla";
import { MockAIService } from "./ai";
import { CATALOGUE_SEED } from "./seed";

const ALLOWED: Record<CaseStatus, CaseStatus[]> = {
  new: ["investigating", "rejected"],
  investigating: ["rights_validation", "rejected", "approved_hold"],
  rights_validation: ["legal_review", "approved_hold", "investigating"],
  legal_review: ["legal_approved", "approved_hold", "rejected"],
  legal_approved: ["notice_ready"],
  notice_ready: ["submitted"],
  submitted: ["awaiting_response"],
  awaiting_response: ["removed", "escalated", "rejected"],
  removed: ["monitoring"],
  escalated: ["awaiting_response", "legal_review", "monitoring"],
  monitoring: ["reopened", "closed"],
  reopened: ["investigating", "legal_review", "notice_ready"],
  closed: ["reopened"],
  approved_hold: ["investigating", "legal_review", "rejected"],
  rejected: [],
};

function now() {
  return new Date().toISOString();
}

function audit(
  state: AppState,
  user: SessionUser,
  action: string,
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown
) {
  state.auditEvents.unshift({
    id: `AUD-${nextSeq()}`,
    tenantId: user.tenantId,
    timestamp: now(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    entity,
    entityId,
    before,
    after,
    ip: "127.0.0.1",
    sessionId: `sess-${user.id}`,
  });
}

function notify(
  state: AppState,
  title: string,
  body: string,
  href: string,
  severity: "critical" | "high" | "medium" | "info",
  audience: Role[] | "all" = "all"
) {
  state.notifications.unshift({
    id: `NTF-${nextSeq()}`,
    tenantId: TENANT_ID,
    title,
    body,
    severity,
    createdAt: now(),
    read: false,
    href,
    audience,
  });
}

function requirePerm(user: SessionUser, perm: Permission) {
  assertCan(user.role, perm);
}

function transition(state: AppState, rec: CaseRecord, to: CaseStatus, user: SessionUser, reason: string) {
  if (!ALLOWED[rec.status].includes(to) && rec.status !== to) {
    throw new Error(`Invalid transition ${rec.status} → ${to}`);
  }
  const from = rec.status;
  rec.status = to;
  rec.lastAction = reason;
  rec.lastActionAt = now();
  state.transitions.push({
    id: `TR-${nextSeq()}`,
    tenantId: rec.tenantId,
    caseId: rec.id,
    from,
    to,
    actorId: user.id,
    timestamp: now(),
    reason,
  });
  audit(state, user, "STATUS_CHANGED", "Case", rec.id, { status: from }, { status: to, reason });
}

function assetFor(id: string) {
  return CATALOGUE_SEED.find((a) => a.id === id);
}

function noticeBody(caseRec: CaseRecord, route: NoticeRoute): Notice {
  const asset = assetFor(caseRec.assetId);
  return {
    id: `NTC-${nextSeq()}`,
    tenantId: caseRec.tenantId,
    caseId: caseRec.id,
    route,
    status: "draft",
    complainant: "S. Chand & Company Limited",
    copyrightedWork: `${caseRec.title}${asset ? ` — ${asset.author} — ISBN ${asset.isbn}` : ""}`,
    ownership:
      "S. Chand & Company Limited is the rights owner of the identified work in the relevant territories.",
    infringingMaterial: `Unauthorized reproduction distributed via ${caseRec.platform}.`,
    location: caseRec.url,
    description: `The listed location makes available an unauthorized copy of a S. Chand protected title (${caseRec.title}).`,
    goodFaithDeclaration:
      "The information in this notice is accurate and the complainant is authorized to act on behalf of the rights owner. This is a simulated prototype notice and is not a live legal filing.",
    authorization: "Pending legal approval",
    signature: "",
    generatedAt: now(),
    approvedBy: null,
    approvedAt: null,
  };
}

export const CaseWorkflowService = {
  createCaseFromFinding(state: AppState, findingId: string, user: SessionUser): CaseRecord {
    requirePerm(user, "finding.promote");
    const finding = state.findings.find((f) => f.id === findingId && f.tenantId === user.tenantId);
    if (!finding) throw new Error("Finding not found");
    if (finding.relatedCaseId) {
      const existing = state.cases.find((c) => c.id === finding.relatedCaseId);
      if (existing) return existing;
    }

    const caseId = findingId === "FND-2026-1092" ? "SC-2026-0842" : `SC-2026-${nextSeq()}`;
    const already = state.cases.find((c) => c.id === caseId);
    if (already) return already;

    const createdAt = now();
    const slaHours = slaHoursFor(
      finding.risk,
      state.configuration.slaRules,
      state.configuration.platforms.find((p) => p.name === finding.platform)?.defaultSlaHours
    );
    const invId = `INV-${nextSeq()}`;
    const rec: CaseRecord = {
      id: caseId,
      tenantId: user.tenantId,
      findingId: finding.id,
      investigationId: invId,
      assetId: finding.assetId,
      title: finding.suspectedTitle,
      platform: finding.platform,
      url: finding.url,
      uploader: finding.uploader,
      entityId: finding.entityId,
      risk: finding.risk,
      priority: finding.priority,
      ownerId: finding.assignedInvestigatorId ?? user.id,
      status: "new",
      noticeRoute: MockAIService.recommendNoticeRoute(finding.platform).route,
      daysOpen: 0,
      slaHours,
      slaDueAt: slaDueAt(createdAt, slaHours),
      slaState: slaState(createdAt, slaHours),
      reappearance: Boolean(finding.relatedCaseId),
      lastAction: "Case created from finding",
      lastActionAt: createdAt,
      createdAt,
      hostingCountry: finding.hostingCountry,
      parentCaseId: finding.relatedCaseId && finding.relatedCaseId !== caseId ? finding.relatedCaseId : null,
      evidenceIds: state.evidence.filter((e) => e.findingId === finding.id).map((e) => e.id),
      noticeId: null,
      submissionId: null,
      monitoringJobId: null,
    };

    state.investigations.push({
      id: invId,
      tenantId: user.tenantId,
      findingId: finding.id,
      caseId,
      investigatorId: rec.ownerId,
      status: "open",
      notes: [`Investigation opened from ${finding.id}`],
      createdAt,
      updatedAt: createdAt,
    });

    if (rec.evidenceIds.length === 0) {
      const ev = captureEvidence(state, finding, rec.id, user);
      rec.evidenceIds.push(ev.id);
    }

    finding.status = "promoted";
    finding.relatedCaseId = caseId;
    state.cases.unshift(rec);
    audit(state, user, "CASE_CREATED", "Case", caseId, null, { findingId, status: "new" });
    notify(state, `Case ${caseId} created`, `${finding.suspectedTitle} promoted from ${finding.id}`, `/cases/${caseId}`, "high", [
      "lead",
      "investigator",
      "legal",
    ]);
    transition(state, rec, "investigating", user, "Investigation started");
    return rec;
  },

  validateFinding(state: AppState, findingId: string, user: SessionUser, decision: "validated" | "rejected") {
    requirePerm(user, "finding.investigate");
    const finding = state.findings.find((f) => f.id === findingId);
    if (!finding) throw new Error("Finding not found");
    const before = finding.status;
    finding.status = decision;
    audit(state, user, decision === "validated" ? "FINDING_VALIDATED" : "FINDING_REJECTED", "Finding", findingId, { status: before }, { status: decision });
    return finding;
  },

  addInvestigationNote(state: AppState, investigationId: string, note: string, user: SessionUser) {
    requirePerm(user, "finding.investigate");
    const inv = state.investigations.find((i) => i.id === investigationId);
    if (!inv) throw new Error("Investigation not found");
    inv.notes.push(note);
    inv.updatedAt = now();
    return inv;
  },

  confirmInfringement(state: AppState, caseId: string, user: SessionUser, outcome: "confirmed" | "insufficient_evidence" | "false_positive") {
    requirePerm(user, "finding.investigate");
    const rec = mustCase(state, caseId);
    const inv = state.investigations.find((i) => i.id === rec.investigationId);
    if (inv) {
      inv.status = outcome === "confirmed" ? "confirmed" : outcome === "false_positive" ? "false_positive" : "insufficient_evidence";
      inv.notes.push(`Investigator decision: ${outcome}`);
      inv.updatedAt = now();
    }
    if (outcome === "confirmed") {
      if (rec.status === "investigating") transition(state, rec, "rights_validation", user, "Infringement confirmed — rights validation");
      ensureRightsDraft(state, rec);
    } else if (outcome === "false_positive") {
      transition(state, rec, "rejected", user, "False positive");
    } else {
      rec.lastAction = "Additional evidence requested";
      rec.lastActionAt = now();
    }
    return rec;
  },

  approveRights(state: AppState, caseId: string, user: SessionUser, gates?: FourGates) {
    requirePerm(user, "rights.approve");
    const rec = mustCase(state, caseId);
    const rv = ensureRightsDraft(state, rec);
    rv.gates = gates ?? {
      rightsOwnership: "pass",
      infringementSubstantiated: "pass",
      authorization: "pass",
      actionableTarget: "pass",
    };
    rv.confirmed = allGatesPass(rv.gates);
    rv.reviewerId = user.id;
    rv.reviewedAt = now();
    rv.confirmationRequired = false;
    if (!rv.confirmed) {
      if (rec.status === "rights_validation" || rec.status === "investigating") {
        rec.status = "approved_hold";
      }
      rec.lastAction = "Rights hold — further clarification";
      audit(state, user, "RIGHTS_HOLD", "RightsValidation", rv.id, null, rv.gates);
      return { rec, rv, eligible: false as const };
    }
    audit(state, user, "RIGHTS_VALIDATED", "RightsValidation", rv.id, null, { gates: rv.gates, pass: "4/4" });
    if (rec.status === "rights_validation" || rec.status === "investigating" || rec.status === "approved_hold") {
      rec.status = "legal_review";
      state.transitions.push({
        id: `TR-${nextSeq()}`,
        tenantId: rec.tenantId,
        caseId: rec.id,
        from: "rights_validation",
        to: "legal_review",
        actorId: user.id,
        timestamp: now(),
        reason: "4/4 gates passed — eligible for legal review",
      });
    }
    ensureLegal(state, rec);
    notify(state, "Legal approval required", `${rec.id} passed rights validation`, `/cases/${rec.id}`, "high", ["legal"]);
    return { rec, rv, eligible: true as const };
  },

  approveLegal(state: AppState, caseId: string, user: SessionUser) {
    requirePerm(user, "legal.approve");
    const rec = mustCase(state, caseId);
    const rv = state.rightsValidations.find((r) => r.caseId === caseId);
    if (!rv || !allGatesPass(rv.gates)) throw new Error("Four-gate validation must pass before legal approval");
    const lr = ensureLegal(state, rec);
    lr.status = "approved";
    lr.reviewerId = user.id;
    lr.approvedAt = now();
    if (rec.status === "legal_review" || rec.status === "rights_validation") {
      transition(state, rec, "legal_approved", user, "Legal action approved");
    }
    audit(state, user, "LEGAL_APPROVED", "LegalReview", lr.id, { status: "pending" }, { status: "approved" });
    return rec;
  },

  generateNotice(state: AppState, caseId: string, user: SessionUser, route?: NoticeRoute) {
    requirePerm(user, "notice.generate");
    const rec = mustCase(state, caseId);
    if (!["legal_approved", "notice_ready", "legal_review"].includes(rec.status) && rec.status !== "reopened") {
      if (rec.status !== "legal_approved") throw new Error("Notice can be generated only after legal approval");
    }
    const chosen = route ?? rec.noticeRoute ?? MockAIService.recommendNoticeRoute(rec.platform).route;
    rec.noticeRoute = chosen;
    const notice = noticeBody(rec, chosen);
    state.notices.unshift(notice);
    rec.noticeId = notice.id;
    if (rec.status === "legal_approved") transition(state, rec, "notice_ready", user, "Draft notice generated");
    audit(state, user, "NOTICE_GENERATED", "Notice", notice.id, null, { route: chosen });
    return notice;
  },

  updateNotice(state: AppState, noticeId: string, patch: Partial<Notice>, user: SessionUser) {
    requirePerm(user, "notice.generate");
    const n = state.notices.find((x) => x.id === noticeId);
    if (!n) throw new Error("Notice not found");
    Object.assign(n, patch);
    return n;
  },

  approveNotice(state: AppState, noticeId: string, user: SessionUser) {
    requirePerm(user, "notice.approve");
    const n = state.notices.find((x) => x.id === noticeId);
    if (!n) throw new Error("Notice not found");
    n.status = "approved";
    n.approvedBy = user.id;
    n.approvedAt = now();
    n.signature = `${user.name} / S. Chand Legal`;
    n.authorization = `Authorized by ${user.name}`;
    const rec = mustCase(state, n.caseId);
    rec.lastAction = "Notice approved — ready for dispatcher";
    rec.lastActionAt = now();
    audit(state, user, "NOTICE_APPROVED", "Notice", noticeId, { status: "draft" }, { status: "approved" });
    notify(state, "Notice ready for submission", `${rec.id} approved notice awaiting dispatcher`, `/enforcement`, "medium", ["operations"]);
    return n;
  },

  submitNotice(state: AppState, caseId: string, user: SessionUser) {
    requirePerm(user, "notice.submit");
    const rec = mustCase(state, caseId);
    const notice = state.notices.find((n) => n.id === rec.noticeId);
    if (!notice || notice.status !== "approved") throw new Error("Approved notice required before submission");
    const ticketId = rec.id === "SC-2026-0842" ? "TG-IP-72842" : `TG-IP-${72000 + nextSeq()}`;
    const sub = {
      id: `SUB-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      noticeId: notice.id,
      ticketId,
      destination: `${rec.platform} IP reporting workflow`,
      status: "awaiting_response" as const,
      submittedAt: now(),
      submittedBy: user.id,
      simulated: true as const,
    };
    state.submissions.unshift(sub);
    rec.submissionId = sub.id;
    notice.status = "dispatched";
    if (rec.status === "notice_ready" || rec.status === "legal_approved") {
      rec.status = "submitted";
      transition(state, rec, "awaiting_response", user, "SIMULATED SUBMISSION");
    } else if (rec.status === "submitted") {
      transition(state, rec, "awaiting_response", user, "SIMULATED SUBMISSION");
    } else {
      rec.status = "awaiting_response";
    }
    rec.lastAction = `Notice submitted (${ticketId}) — SIMULATED`;
    audit(state, user, "NOTICE_SUBMITTED", "Submission", ticketId, null, { simulated: true, destination: sub.destination });
    return sub;
  },

  recordResponse(state: AppState, caseId: string, user: SessionUser, outcome: "removed" | "rejected" | "more_info" = "removed") {
    const rec = mustCase(state, caseId);
    if (!rec.submissionId) throw new Error("No submission on case");
    const response = {
      id: `PR-${nextSeq()}`,
      tenantId: rec.tenantId,
      submissionId: rec.submissionId,
      caseId: rec.id,
      outcome,
      receivedAt: now(),
      summary: `SIMULATED RESPONSE — ${outcome}`,
      simulated: true as const,
    };
    state.platformResponses.unshift(response);
    const sub = state.submissions.find((s) => s.id === rec.submissionId);
    if (sub) sub.status = outcome === "removed" ? "removed" : "rejected";
    if (outcome === "removed") {
      if (rec.status === "awaiting_response" || rec.status === "submitted") {
        rec.status = "removed";
      }
      this.startMonitoring(state, rec.id, user);
    }
    audit(state, user, "PLATFORM_RESPONSE", "PlatformResponse", response.id, null, { outcome, simulated: true });
    return response;
  },

  startMonitoring(state: AppState, caseId: string, user: SessionUser) {
    const rec = mustCase(state, caseId);
    const cadence = state.configuration.monitoringCadence.find((c) => c.risk === rec.risk);
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(9, 0, 0, 0);
    const job = {
      id: rec.id === "SC-2026-0842" ? "MON-0842" : `MON-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      status: "active" as const,
      windowDays: cadence?.initialDays ?? 30,
      cadence: (cadence?.initialCadence ?? "daily") as "daily" | "weekly" | "monthly",
      startedAt: now(),
      nextScanAt: next.toISOString(),
      lastScanAt: now(),
    };
    const existing = state.monitoringJobs.find((m) => m.caseId === rec.id);
    if (existing) Object.assign(existing, job);
    else state.monitoringJobs.unshift(job);
    rec.monitoringJobId = job.id;
    if (rec.status === "removed" || rec.status === "awaiting_response") {
      rec.status = "monitoring";
      state.transitions.push({
        id: `TR-${nextSeq()}`,
        tenantId: rec.tenantId,
        caseId: rec.id,
        from: "removed",
        to: "monitoring",
        actorId: user.id,
        timestamp: now(),
        reason: "Enforcement successful — monitoring remains active",
      });
    }
    rec.lastAction = "Content removed — monitoring active";
    rec.lastActionAt = now();
    audit(state, user, "MONITORING_STARTED", "MonitoringJob", job.id, null, job);
    return job;
  },

  simulateReappearance(state: AppState, caseId: string, user: SessionUser) {
    const rec = mustCase(state, caseId);
    const findingId = rec.id === "SC-2026-0842" ? "FND-2026-1148" : `FND-2026-${nextSeq()}`;
    const existingFinding = state.findings.find((f) => f.id === findingId);
    const existingRea = state.reappearances.find((r) => r.newFindingId === findingId && r.originalCaseId === rec.id);
    if (existingFinding?.status === "linked_reappearance" && existingRea) {
      rec.reappearance = true;
      state.demo.reappearanceSimulated = true;
      return {
        finding: existingFinding,
        reappearance: existingRea,
        evidence: state.evidence.find((e) => e.findingId === findingId) ?? null,
      };
    }
    if (existingFinding) {
      state.findings = state.findings.filter((f) => f.id !== findingId);
    }
    if (findingId === "FND-2026-1148") {
      state.evidence = state.evidence.filter((e) => e.id !== "EV-1148-A");
    }

    const finding: Finding = {
      id: findingId,
      tenantId: rec.tenantId,
      detectedAt: rec.id === "SC-2026-0842" ? "2026-09-07T08:42:00.000Z" : now(),
      platform: "Independent File Host",
      platformCategory: "cyberlocker",
      url:
        rec.id === "SC-2026-0842"
          ? "https://files.example-demo.com/math10/rs-aggarwal-2026.pdf"
          : `https://files.example-demo.com/mirror/${rec.assetId.toLowerCase()}.pdf`,
      suspectedTitle: rec.title,
      assetId: rec.assetId,
      uploader: "StudyVault_Admin",
      entityId: "ENT-0007",
      matchScore: 97,
      aiConfidence: 97,
      priority: "critical",
      risk: "critical",
      status: "linked_reappearance",
      assignedInvestigatorId: rec.ownerId,
      hostingCountry: "IN",
      watermarkDetected: true,
      ocrSimilarity: 97,
      metadata: {
        isbnDetected: assetFor(rec.assetId)?.isbn ?? "",
        fingerprint: "MATCH",
        watermark: "MATCH",
      },
      relatedFindingIds: [rec.findingId],
      relatedCaseId: rec.id,
      notes: "LIKELY REAPPEARANCE of previously removed content.",
      sourceConnector: "MockWebConnector",
      jobId: null,
    };
    state.findings.unshift(finding);

    const evId = finding.id === "FND-2026-1148" ? "EV-1148-A" : `EV-${nextSeq()}-A`;
    const capturedAt = finding.detectedAt;
    const ev: Evidence = {
      id: evId,
      tenantId: rec.tenantId,
      caseId: rec.id,
      findingId: finding.id,
      type: "pdf_binary",
      sourceUrl: finding.url,
      capturedAt,
      capturedBy: "system-monitor",
      toolVersion: TOOL_VERSION,
      sha256: evidenceHash({ id: evId, sourceUrl: finding.url, capturedAt, type: "pdf_binary" }),
      storageLocation: `s3://schand-evidence-demo/${rec.id}/${evId}`,
      chainOfCustodyStatus: "intact",
      integrity: "verified",
      relatedEvidenceId: rec.evidenceIds[0] ?? null,
      metadata: { relationship: "REAPPEARANCE_OF" },
      previewLabel: "Reappearance PDF Binary",
    };
    state.evidence.unshift(ev);
    ["captured", "hash_generated", "stored"].forEach((event) => {
      state.custodyEvents.push({
        id: `CUS-${nextSeq()}`,
        tenantId: rec.tenantId,
        evidenceId: ev.id,
        event: event as Evidence["chainOfCustodyStatus"] extends never ? never : "captured",
        actorId: user.id,
        timestamp: now(),
        detail: `${event} for reappearance evidence ${ev.id}`,
      });
    });

    const rea = {
      id: `REA-${nextSeq()}`,
      tenantId: rec.tenantId,
      originalCaseId: rec.id,
      newFindingId: finding.id,
      originalUrl: rec.url,
      newUrl: finding.url,
      platform: finding.platform,
      uploader: finding.uploader,
      similarity: 97,
      titleSimilarity: 99,
      isbnMatch: true,
      fingerprintMatch: true,
      watermarkMatch: true,
      relationship: "reappearance_of" as const,
      detectedAt: finding.detectedAt,
      confidence: 0.97,
      reasons: [
        "Same ISBN",
        "Same edition",
        "97% content similarity",
        "Matching document fingerprint",
        "Matching watermark pattern",
        "Same protected asset",
        "Related uploader entity",
        "Previous enforcement history",
      ],
      confirmed: false,
    };
    state.reappearances.unshift(rea);
    rec.reappearance = true;

    const entity = state.entities.find((e) => e.id === "ENT-0007");
    if (entity) {
      entity.reappearances += 1;
      entity.previousCases += 1;
      entity.riskScore = repeatOffenderScore({
        previousCases: entity.previousCases,
        reappearances: entity.reappearances,
        platforms: entity.platforms.length,
        successfulRemovals: entity.successfulRemovals,
        avgTimeToReappearanceDays: entity.avgTimeToReappearanceDays,
      });
      if (!entity.labels.includes("REPEAT OFFENDER")) entity.labels.push("REPEAT OFFENDER");
    }

    const originalRv = state.rightsValidations.find((r) => r.caseId === rec.id && r.confirmed);
    if (originalRv) {
      state.rightsValidations.unshift({
        ...originalRv,
        id: `RV-${nextSeq()}`,
        inheritedFromCaseId: rec.id,
        confirmationRequired: true,
        confirmed: false,
        notes: "Previous rights validation available — confirmation required.",
        reviewedAt: null,
        reviewerId: null,
      });
    }

    state.demo.reappearanceSimulated = true;
    notify(
      state,
      "REAPPEARANCE DETECTED",
      `Previously removed content associated with ${rec.id} has been detected at a new location.`,
      `/radar?case=${rec.id}`,
      "critical",
      "all"
    );
    audit(state, user, "REAPPEARANCE_DETECTED", "Reappearance", rea.id, null, {
      originalCaseId: rec.id,
      newFindingId: finding.id,
      confidence: 0.97,
    });
    return { finding, reappearance: rea, evidence: ev };
  },

  confirmReappearance(state: AppState, reappearanceId: string, user: SessionUser) {
    requirePerm(user, "finding.investigate");
    const rea = state.reappearances.find((r) => r.id === reappearanceId);
    if (!rea) throw new Error("Reappearance not found");
    rea.confirmed = true;
    audit(state, user, "REAPPEARANCE_CONFIRMED", "Reappearance", rea.id, { confirmed: false }, { confirmed: true });
    return rea;
  },

  reopenCase(state: AppState, caseId: string, user: SessionUser, findingId?: string) {
    requirePerm(user, "case.edit");
    const rec = mustCase(state, caseId);
    if (rec.status !== "monitoring" && rec.status !== "closed" && rec.status !== "removed") {
      throw new Error("Only monitored/closed cases can be reopened from reappearance");
    }
    rec.status = "reopened";
    rec.lastAction = "CASE REOPENED — verified reappearance of previously removed content";
    rec.lastActionAt = now();
    rec.priority = "critical";
    rec.risk = "critical";
    state.transitions.push({
      id: `TR-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      from: "monitoring",
      to: "reopened",
      actorId: user.id,
      timestamp: now(),
      reason: `Verified reappearance${findingId ? ` via ${findingId}` : ""}`,
    });
    transition(state, rec, "investigating", user, "New enforcement cycle started");
    notify(state, "CASE REOPENED", `${rec.id} reopened for new enforcement cycle`, `/cases/${rec.id}`, "critical", [
      "legal",
      "lead",
      "investigator",
    ]);
    audit(state, user, "CASE_REOPENED", "Case", rec.id, { status: "monitoring" }, { status: "investigating", findingId });
    return rec;
  },

  closeCase(state: AppState, caseId: string, user: SessionUser, reason: string) {
    requirePerm(user, "case.edit");
    const rec = mustCase(state, caseId);
    if (!["monitoring", "removed", "rejected", "approved_hold"].includes(rec.status)) {
      throw new Error("Case cannot be closed from current status");
    }
    if (rec.status === "removed") this.startMonitoring(state, caseId, user);
    if (rec.status === "monitoring") transition(state, rec, "closed", user, reason || "Closed after monitoring window");
    else rec.status = "closed";
    rec.lastAction = reason || "Case closed";
    audit(state, user, "CASE_CLOSED", "Case", rec.id, null, { reason });
    return rec;
  },

  escalate(state: AppState, caseId: string, user: SessionUser, reason: string) {
    const rec = mustCase(state, caseId);
    const esc = {
      id: `ESC-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      reason,
      createdAt: now(),
      status: "open" as const,
      notifyRoles: ["legal" as Role, "lead" as Role],
      recommendedRoute: "escalated_legal" as NoticeRoute,
    };
    state.escalations.unshift(esc);
    rec.status = "escalated";
    rec.lastAction = reason;
    notify(state, "Escalation required", `${rec.id}: ${reason}`, `/cases/${rec.id}`, "high", ["legal", "lead"]);
    audit(state, user, "ESCALATION_TRIGGERED", "Escalation", esc.id, null, esc);
    return esc;
  },

  assignCase(state: AppState, caseId: string, ownerId: string, user: SessionUser) {
    requirePerm(user, "case.assign");
    const rec = mustCase(state, caseId);
    const before = rec.ownerId;
    rec.ownerId = ownerId;
    audit(state, user, "CASE_ASSIGNED", "Case", rec.id, { ownerId: before }, { ownerId });
    return rec;
  },
};

function mustCase(state: AppState, caseId: string) {
  const rec = state.cases.find((c) => c.id === caseId && c.tenantId === TENANT_ID);
  if (!rec) throw new Error("Case not found");
  return rec;
}

function ensureRightsDraft(state: AppState, rec: CaseRecord) {
  let rv = state.rightsValidations.find((r) => r.caseId === rec.id && !r.inheritedFromCaseId);
  const asset = assetFor(rec.assetId);
  if (!rv) {
    rv = {
      id: `RV-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      gates: emptyGates("fail"),
      inheritedFromCaseId: null,
      confirmationRequired: false,
      confirmed: false,
      reviewerId: null,
      reviewedAt: null,
      notes: "",
      title: rec.title,
      isbn: asset?.isbn ?? "",
      edition: asset?.edition ?? "",
      author: asset?.author ?? "",
      rightsOwner: asset?.rightsOwner ?? "S. Chand & Company Limited",
      territory: asset?.territories.join(", ") ?? "IN",
    };
    state.rightsValidations.unshift(rv);
  }
  return rv;
}

function ensureLegal(state: AppState, rec: CaseRecord) {
  let lr = state.legalReviews.find((l) => l.caseId === rec.id);
  const recRoute = MockAIService.recommendNoticeRoute(rec.platform);
  if (!lr) {
    lr = {
      id: `LR-${nextSeq()}`,
      tenantId: rec.tenantId,
      caseId: rec.id,
      reviewerId: null,
      status: "pending",
      jurisdiction: "India — Intermediary / Platform IP",
      recommendedRoute: recRoute.route,
      routeConfidence: recRoute.confidence,
      routeReason: recRoute.reason,
      approvedAt: null,
      notes: "",
    };
    state.legalReviews.unshift(lr);
  }
  rec.noticeRoute = rec.noticeRoute ?? recRoute.route;
  return lr;
}

function captureEvidence(state: AppState, finding: Finding, caseId: string, user: SessionUser): Evidence {
  const id = `EV-${nextSeq()}-A`;
  const capturedAt = now();
  const ev: Evidence = {
    id,
    tenantId: finding.tenantId,
    caseId,
    findingId: finding.id,
    type: "pdf_binary",
    sourceUrl: finding.url,
    capturedAt,
    capturedBy: user.id,
    toolVersion: TOOL_VERSION,
    sha256: evidenceHash({ id, sourceUrl: finding.url, capturedAt, type: "pdf_binary" }),
    storageLocation: `s3://schand-evidence-demo/${caseId}/${id}`,
    chainOfCustodyStatus: "intact",
    integrity: "verified",
    relatedEvidenceId: null,
    metadata: { matchScore: finding.matchScore },
    previewLabel: "PDF Binary",
  };
  state.evidence.unshift(ev);
  ["captured", "hash_generated", "stored"].forEach((event) => {
    state.custodyEvents.push({
      id: `CUS-${nextSeq()}`,
      tenantId: finding.tenantId,
      evidenceId: ev.id,
      event: event as "captured",
      actorId: user.id,
      timestamp: now(),
      detail: `${event} for ${ev.id}`,
    });
  });
  audit(state, user, "EVIDENCE_CAPTURED", "Evidence", ev.id, null, { sha256: ev.sha256 });
  return ev;
}

export function verifyEvidenceHash(state: AppState, evidenceId: string, user: SessionUser) {
  const ev = state.evidence.find((e) => e.id === evidenceId);
  if (!ev) throw new Error("Evidence not found");
  const expected = evidenceHash({
    id: ev.id,
    sourceUrl: ev.sourceUrl,
    capturedAt: ev.capturedAt,
    type: ev.type,
  });
  const ok = expected === ev.sha256;
  ev.integrity = ok ? "verified" : "mismatch";
  state.custodyEvents.push({
    id: `CUS-${nextSeq()}`,
    tenantId: ev.tenantId,
    evidenceId: ev.id,
    event: "hash_verified",
    actorId: user.id,
    timestamp: now(),
    detail: ok ? "HASH VERIFIED" : "HASH MISMATCH",
  });
  audit(state, user, "EVIDENCE_ACCESSED", "Evidence", ev.id, null, { integrity: ev.integrity });
  return { ok, expected, actual: ev.sha256 };
}

export function accessEvidence(state: AppState, evidenceId: string, user: SessionUser) {
  const ev = state.evidence.find((e) => e.id === evidenceId);
  if (!ev) throw new Error("Evidence not found");
  state.custodyEvents.push({
    id: `CUS-${nextSeq()}`,
    tenantId: ev.tenantId,
    evidenceId: ev.id,
    event: "investigator_accessed",
    actorId: user.id,
    timestamp: now(),
    detail: `${user.name} accessed evidence`,
  });
  audit(state, user, "EVIDENCE_ACCESSED", "Evidence", ev.id, null, { access: true });
  return ev;
}
