import { TENANT_ID, FINANCIAL_METHODOLOGY, FINANCIAL_VERSION, MODEL_MATCH, MODEL_MATCH_VERSION, PROMPT_VERSION, RISK_METHODOLOGY, TOOL_VERSION } from "./constants";
import { evidenceHash } from "./hash";
import { nextSeq, resetSeq } from "./ids";
import { repeatOffenderScore, slaDueAt, slaHoursFor, slaState, daysOpen } from "./sla";
import { PLATFORMS, UPLOADERS, mulberry32, routeFor, user } from "./seed";
import type { DatasetCsvRow } from "./csv";
import type {
  AppState,
  CaseRecord,
  CaseStatus,
  CatalogueAsset,
  Evidence,
  Finding,
  RiskLevel,
} from "./types";

/**
 * Builds a full, self-contained AppState from an uploaded catalogue CSV, using
 * the same procedural techniques as lib/seed.ts's buildSeed() (deterministic
 * RNG, the shared SLA/hash/id helpers) but with no signature case or demo
 * story of its own — every record here is generated from the CSV rows, so an
 * upload can fully replace the workspace without leaving anything blank.
 *
 * `runSeq` namespaces every generated ID (SC-DS{runSeq}-..., FND-DS{runSeq}-...)
 * so a second upload in the same session never collides with IDs from the first.
 */
export function buildDatasetSeed(rows: DatasetCsvRow[], datasetLabel: string, runSeq: number): AppState {
  resetSeq(9000 + runSeq * 1000);
  const rng = mulberry32(20260900 + runSeq);
  const NOW = new Date("2026-09-04T10:00:00Z");
  const HOUR = 3600 * 1000;
  const run = `DS${runSeq}`;

  function iso(daysAgo: number, hour = 10): string {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hour, 12, 0, 0);
    return d.toISOString();
  }

  const slaRules = [
    { id: "sla-c", tenantId: TENANT_ID, risk: "critical" as const, hours: 24 },
    { id: "sla-h", tenantId: TENANT_ID, risk: "high" as const, hours: 48 },
    { id: "sla-m", tenantId: TENANT_ID, risk: "medium" as const, hours: 120 },
    { id: "sla-l", tenantId: TENANT_ID, risk: "low" as const, hours: 240 },
  ];

  const users = [
    user("USR-EXEC-01", "Mr. Sourabh", "CFO / CXO Group", "sourabh@schand.demo", "executive"),
    user("USR-LEAD-01", "Mr. Murli", "Anti-Piracy Lead", "murli@schand.demo", "lead"),
    user("USR-TECH-01", "B. Pradhan", "Technology Lead", "b.pradhan@schand.demo", "admin"),
    user("USR-INV-01", "Investigator 01", "Anti-Piracy Investigator", "inv01@schand.demo", "investigator"),
    user("USR-INV-02", "Enforcement Analyst 02", "Enforcement Analyst", "inv02@schand.demo", "investigator"),
    user("USR-LEG-01", "Legal Reviewer 01", "Legal Counsel", "legal@schand.demo", "legal"),
    user("USR-OPS-01", "Platform Operations 01", "Enforcement Dispatcher", "ops@schand.demo", "operations"),
  ];

  const catalogue: CatalogueAsset[] = rows.map((row, i) => ({
    id: row.id,
    tenantId: TENANT_ID,
    title: row.title,
    isbn: row.isbn,
    edition: "2026",
    author: row.author,
    category: row.category,
    segment: row.segment,
    priorityTitle: row.priorityTitle.toLowerCase() === "true",
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN", "AE"],
    releaseDate: "2026-01-01",
    status: "active",
    aliases: [],
    piracyPatterns: [`${row.platformBias} uploads`],
    indicativeValueInr: Number(row.indicativeValueInr) || 400 + i * 10,
  }));

  const findings: Finding[] = [];
  const cases: CaseRecord[] = [];
  const evidence: Evidence[] = [];
  const custody: AppState["custodyEvents"] = [];
  const investigations: AppState["investigations"] = [];
  const rights: AppState["rightsValidations"] = [];
  const legal: AppState["legalReviews"] = [];
  const notices: AppState["notices"] = [];
  const submissions: AppState["submissions"] = [];
  const responses: AppState["platformResponses"] = [];
  const escalations: AppState["escalations"] = [];
  const monitoring: AppState["monitoringJobs"] = [];
  const reappearances: AppState["reappearances"] = [];
  const riskAssessments: AppState["riskAssessments"] = [];
  const aiAssessments: AppState["aiAssessments"] = [];

  function addEvidence(caseId: string, findingId: string, url: string): string[] {
    const eid = `EV-${run}-${caseId.slice(-4)}`;
    const capturedAt = iso(2, 9);
    evidence.push({
      id: eid,
      tenantId: TENANT_ID,
      caseId,
      findingId,
      type: "pdf_binary",
      sourceUrl: url,
      capturedAt,
      capturedBy: "USR-INV-02",
      toolVersion: TOOL_VERSION,
      sha256: evidenceHash({ id: eid, sourceUrl: url, capturedAt, type: "pdf_binary" }),
      storageLocation: `s3://schand-evidence-demo/${caseId}/${eid}`,
      chainOfCustodyStatus: "intact",
      integrity: "verified",
      relatedEvidenceId: null,
      metadata: { dataset: datasetLabel },
      previewLabel: "PDF Binary",
    });
    (["captured", "hash_generated", "stored"] as const).forEach((event) => {
      custody.push({
        id: `CUS-${nextSeq()}`,
        tenantId: TENANT_ID,
        evidenceId: eid,
        event,
        actorId: "USR-INV-02",
        timestamp: capturedAt,
        detail: `${event.replace("_", " ")} for ${eid}`,
      });
    });
    return [eid];
  }

  // One case per (title x slot) so every catalogue row appears across the full
  // status range: pre-notice, in-flight, removed/monitoring, closed, and one
  // escalated + one reopened case each, so no status/page is ever empty.
  type Slot = { status: CaseStatus; sla: "within" | "approaching" | "breached" };
  const SLOTS: Slot[] = [
    { status: "new", sla: "within" },
    { status: "investigating", sla: "within" },
    { status: "legal_review", sla: "approaching" },
    { status: "submitted", sla: "within" },
    { status: "awaiting_response", sla: "approaching" },
    { status: "removed", sla: "within" },
    { status: "monitoring", sla: "within" },
    { status: "escalated", sla: "breached" },
    { status: "closed", sla: "within" },
  ];

  const REMOVAL_DAYS: Record<string, number> = {
    Telegram: 1.6, "Google Drive": 1.9, Website: 2.4, "Social Media": 2.6, Marketplace: 3.4, Cyberlocker: 4.1,
  };
  const RIGHTS_ON: CaseStatus[] = ["rights_validation", "legal_review", "legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated", "reopened"];
  const LEGAL_ON: CaseStatus[] = ["legal_review", "legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated", "reopened"];
  const DISPATCHED: CaseStatus[] = ["submitted", "awaiting_response", "escalated", "removed", "monitoring", "closed", "reopened"];
  const REMOVED: CaseStatus[] = ["removed", "monitoring", "closed", "reopened"];
  const MONITORED: CaseStatus[] = ["removed", "monitoring", "closed", "reopened", "escalated"];
  const LAST_ACTION: Partial<Record<CaseStatus, string>> = {
    new: "Case opened from validated finding",
    investigating: "Investigator gathering evidence",
    legal_review: "Awaiting legal review",
    submitted: "Notice submitted to platform",
    awaiting_response: "Awaiting platform response",
    escalated: "SLA breached — escalated to Lead and Legal",
    removed: "Content removed — monitoring started",
    monitoring: "Content removed — monitoring active",
    reopened: "Reappearance confirmed — case reopened",
    closed: "Closed — monitoring window completed",
  };

  let idx = 0;
  catalogue.forEach((asset, ai) => {
    const biasedPlatform = PLATFORMS.find((p) => p.name === rows[ai].platformBias) ?? PLATFORMS[ai % PLATFORMS.length];

    SLOTS.forEach((slot, si) => {
      const plat = si % 3 === 0 ? biasedPlatform : PLATFORMS[(ai + si) % PLATFORMS.length];
      const risk: RiskLevel = asset.priorityTitle ? (si % 4 === 0 ? "critical" : si % 3 === 0 ? "high" : "medium") : si % 5 === 0 ? "high" : si % 2 === 0 ? "medium" : "low";
      const uploader = UPLOADERS[(ai + si) % UPLOADERS.length];
      const caseId = `SC-${run}-${900 + idx}`;
      const fid = `FND-${run}-${1200 + idx}`;
      const invId = `INV-${run}-${900 + idx}`;
      const slaHours = slaHoursFor(risk, slaRules, plat.name === "Telegram" ? 72 : undefined);
      const removalDays = Math.round((REMOVAL_DAYS[plat.name] + rng() * 0.5) * 10) / 10;
      const removed = REMOVED.includes(slot.status);
      const dispatched = DISPATCHED.includes(slot.status);

      let createdMs: number;
      if (removed) {
        const daysAgo = slot.status === "closed" ? 25 + idx : 3 + Math.ceil(removalDays) + idx;
        createdMs = NOW.getTime() - daysAgo * 24 * HOUR;
      } else if (slot.sla === "breached") {
        createdMs = NOW.getTime() - (slaHours + 12 + idx) * HOUR;
      } else if (slot.sla === "approaching") {
        createdMs = NOW.getTime() - slaHours * 0.9 * HOUR;
      } else {
        createdMs = NOW.getTime() - slaHours * 0.3 * HOUR;
      }
      const createdAt = new Date(createdMs).toISOString();
      const elapsedH = (NOW.getTime() - createdMs) / HOUR;
      const at = (hoursAfterCreate: number) => new Date(createdMs + hoursAfterCreate * HOUR).toISOString();
      const noticeAtH = removed ? 12 : Math.min(4, elapsedH / 4);
      const submittedAtH = removed ? 24 : Math.min(6, elapsedH / 3);
      const removedAtH = submittedAtH + removalDays * 24;

      const match = risk === "critical" ? 95 + (idx % 5) : risk === "high" ? 88 + (idx % 7) : risk === "medium" ? 78 + (idx % 10) : 68 + (idx % 10);
      const url = `https://example-demo.com/${plat.cat}/${asset.id.toLowerCase()}/${run}-${1200 + idx}`;

      findings.push({
        id: fid,
        tenantId: TENANT_ID,
        detectedAt: new Date(createdMs - 2 * HOUR).toISOString(),
        platform: plat.name,
        platformCategory: plat.cat,
        url,
        suspectedTitle: asset.title,
        assetId: asset.id,
        uploader: uploader.name,
        entityId: uploader.entity,
        matchScore: match,
        aiConfidence: Math.min(99, match + 2),
        priority: risk,
        risk,
        status: "promoted",
        assignedInvestigatorId: idx % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
        hostingCountry: plat.country,
        watermarkDetected: match >= 85,
        ocrSimilarity: Math.max(60, match - 4),
        metadata: { dataset: datasetLabel, region: plat.country },
        relatedFindingIds: [],
        relatedCaseId: caseId,
        notes: "",
        sourceConnector: `Uploaded dataset (${datasetLabel})`,
        jobId: null,
      });

      const rec: CaseRecord = {
        id: caseId,
        tenantId: TENANT_ID,
        findingId: fid,
        investigationId: invId,
        assetId: asset.id,
        title: asset.title,
        platform: plat.name,
        url,
        uploader: uploader.name,
        entityId: uploader.entity,
        risk,
        priority: risk,
        ownerId: idx % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
        status: slot.status,
        noticeRoute: LEGAL_ON.includes(slot.status) ? routeFor(plat.name) : null,
        daysOpen: daysOpen(createdAt, NOW),
        slaHours,
        slaDueAt: slaDueAt(createdAt, slaHours),
        slaState: removed ? "within" : slaState(createdAt, slaHours, NOW),
        reappearance: false,
        lastAction: LAST_ACTION[slot.status] ?? `Status ${slot.status}`,
        lastActionAt: removed ? at(removedAtH) : dispatched ? at(submittedAtH) : createdAt,
        createdAt,
        hostingCountry: plat.country,
        parentCaseId: null,
        evidenceIds: addEvidence(caseId, fid, url),
        noticeId: null,
        submissionId: null,
        monitoringJobId: null,
      };

      investigations.push({
        id: invId,
        tenantId: TENANT_ID,
        findingId: fid,
        caseId,
        investigatorId: rec.ownerId,
        status: slot.status === "new" || slot.status === "investigating" ? "open" : "confirmed",
        notes: [`Investigation opened for ${asset.title}`],
        createdAt,
        updatedAt: createdAt,
      });

      if (RIGHTS_ON.includes(slot.status)) {
        rights.push({
          id: `RV-${run}-${900 + idx}`,
          tenantId: TENANT_ID,
          caseId,
          gates: { rightsOwnership: "pass", infringementSubstantiated: "pass", authorization: "pass", actionableTarget: "pass" },
          inheritedFromCaseId: null,
          confirmationRequired: false,
          confirmed: slot.status !== "rights_validation",
          reviewerId: "USR-LEG-01",
          reviewedAt: createdAt,
          notes: "4/4 validated",
          title: asset.title,
          isbn: asset.isbn,
          edition: asset.edition,
          author: asset.author,
          rightsOwner: "S. Chand & Company Limited",
          territory: "IN",
        });
      }

      if (LEGAL_ON.includes(slot.status)) {
        legal.push({
          id: `LR-${run}-${900 + idx}`,
          tenantId: TENANT_ID,
          caseId,
          reviewerId: "USR-LEG-01",
          status: slot.status === "legal_review" ? "pending" : "approved",
          jurisdiction: "India",
          recommendedRoute: routeFor(plat.name),
          routeConfidence: "high",
          routeReason: "Configured route for platform.",
          approvedAt: slot.status === "legal_review" ? null : at(noticeAtH),
          notes: "",
        });
      }

      if (dispatched || slot.status === "notice_ready") {
        const nid = `NTC-${run}-${900 + idx}`;
        rec.noticeId = nid;
        notices.push({
          id: nid,
          tenantId: TENANT_ID,
          caseId,
          route: routeFor(plat.name),
          status: dispatched ? "dispatched" : "approved",
          complainant: "S. Chand & Company Limited",
          copyrightedWork: asset.title,
          ownership: "S. Chand & Company Limited",
          infringingMaterial: `Unauthorized copy at ${url}`,
          location: url,
          description: "Unauthorized distribution of a S. Chand protected work.",
          goodFaithDeclaration: "Simulated prototype notice — not a live legal filing.",
          authorization: "Legal Reviewer 01",
          signature: "Legal Reviewer 01 (demo)",
          generatedAt: at(noticeAtH),
          approvedBy: "USR-LEG-01",
          approvedAt: at(noticeAtH),
        });
      }

      if (dispatched) {
        const sid = `SUB-${run}-${900 + idx}`;
        rec.submissionId = sid;
        submissions.push({
          id: sid,
          tenantId: TENANT_ID,
          caseId,
          noticeId: rec.noticeId as string,
          ticketId: `${plat.name.slice(0, 2).toUpperCase()}-IP-${run}-${70000 + idx}`,
          destination: `${plat.name} IP reporting workflow`,
          status: removed ? "removed" : slot.status === "submitted" ? "submitted" : "awaiting_response",
          submittedAt: at(submittedAtH),
          submittedBy: "USR-OPS-01",
          simulated: true,
        });
      }

      if (removed) {
        responses.push({
          id: `PR-${run}-${900 + idx}`,
          tenantId: TENANT_ID,
          submissionId: rec.submissionId as string,
          caseId,
          outcome: "removed",
          receivedAt: at(removedAtH),
          summary: `SIMULATED RESPONSE — removed after ${removalDays} days`,
          simulated: true,
        });
      }

      if (MONITORED.includes(slot.status)) {
        const mid = `MON-${run}-${900 + idx}`;
        rec.monitoringJobId = mid;
        monitoring.push({
          id: mid,
          tenantId: TENANT_ID,
          caseId,
          status: slot.status === "closed" ? "completed" : "active",
          windowDays: risk === "critical" || risk === "high" ? 30 : risk === "medium" ? 60 : 90,
          cadence: risk === "critical" || risk === "high" ? "daily" : risk === "medium" ? "weekly" : "monthly",
          startedAt: removed ? at(removedAtH) : at(submittedAtH),
          nextScanAt: iso(0, 9),
          lastScanAt: removed ? at(removedAtH) : null,
        });
      }

      if (slot.status === "escalated") {
        escalations.push({
          id: `ESC-${run}-${900 + idx}`,
          tenantId: TENANT_ID,
          caseId,
          reason: "SLA breached — escalation required",
          createdAt: at(slaHours),
          status: "open",
          notifyRoles: ["legal", "lead"],
          recommendedRoute: "escalated_legal",
        });
      }

      if (risk === "critical" || risk === "high") {
        riskAssessments.push({
          id: `RSK-${caseId}`,
          tenantId: TENANT_ID,
          subjectType: "case",
          subjectId: caseId,
          score: risk === "critical" ? 92 : 78,
          level: risk,
          input: { match, priorityTitle: asset.priorityTitle },
          assumption: "Priority title weight applied when catalogue flag is set.",
          methodology: RISK_METHODOLOGY,
          methodologyVersion: "RSK-v0.1",
          confidence: 0.82,
          timestamp: createdAt,
        });
      }

      aiAssessments.push({
        id: `AI-${caseId}`,
        tenantId: TENANT_ID,
        subjectType: "finding",
        subjectId: fid,
        recommendation: risk === "critical" || risk === "high" ? "Escalate for immediate takedown" : "Standard enforcement queue",
        confidence: match / 100,
        model: MODEL_MATCH,
        version: MODEL_MATCH_VERSION,
        promptVersion: PROMPT_VERSION,
        timestamp: createdAt,
        inputs: { matchScore: match, priorityTitle: asset.priorityTitle, platform: plat.name },
        methodology: "Deterministic rule-based scoring — not a live model call.",
        humanValidationRequired: true,
      });

      cases.push(rec);
      idx += 1;
    });

    // One reappearance per title, on its monitoring/removed case, so the
    // Reappearance Radar is never empty for an uploaded dataset either.
    // reappBase sits well past the last main-loop finding id (1200 + catalogue.length
    // * SLOTS.length) regardless of catalogue size, so the two ranges never collide.
    const reappBase = 1200 + catalogue.length * SLOTS.length + 200;
    const monitored = cases.filter((c) => c.assetId === asset.id && (c.status === "monitoring" || c.status === "removed"))[0];
    if (monitored) {
      const rfid = `FND-${run}-${reappBase + ai}`;
      const rurl = `https://mirror.example-demo.com/${asset.id.toLowerCase()}/${run}-${reappBase + ai}`;
      findings.push({
        id: rfid,
        tenantId: TENANT_ID,
        detectedAt: iso(ai % 5, 8),
        platform: monitored.platform,
        platformCategory: PLATFORMS.find((p) => p.name === monitored.platform)?.cat ?? "web",
        url: rurl,
        suspectedTitle: asset.title,
        assetId: asset.id,
        uploader: monitored.uploader,
        entityId: monitored.entityId,
        matchScore: 90 + (ai % 8),
        aiConfidence: 92,
        priority: monitored.priority,
        risk: monitored.risk,
        status: "linked_reappearance",
        assignedInvestigatorId: monitored.ownerId,
        hostingCountry: "IN",
        watermarkDetected: true,
        ocrSimilarity: 91,
        metadata: { mirror: true, dataset: datasetLabel },
        relatedFindingIds: [monitored.findingId],
        relatedCaseId: monitored.id,
        notes: "Linked reappearance of prior enforcement.",
        sourceConnector: `Uploaded dataset (${datasetLabel})`,
        jobId: null,
      });
      monitored.reappearance = true;
      reappearances.push({
        id: `REA-${run}-${reappBase + ai}`,
        tenantId: TENANT_ID,
        originalCaseId: monitored.id,
        newFindingId: rfid,
        originalUrl: monitored.url,
        newUrl: rurl,
        platform: monitored.platform,
        uploader: monitored.uploader,
        similarity: 90 + (ai % 8),
        titleSimilarity: 98,
        isbnMatch: true,
        fingerprintMatch: true,
        watermarkMatch: true,
        relationship: "likely_mirror",
        detectedAt: iso(ai % 5, 8),
        confidence: 0.9,
        reasons: ["Same ISBN", "Same protected asset", "High content similarity"],
        confirmed: ai % 2 === 0,
      });
    }
  });

  const entities: AppState["entities"] = UPLOADERS.map((u, i) => {
    const previousCases = cases.filter((c) => c.uploader === u.name).length;
    const reapps = reappearances.filter((r) => r.uploader === u.name).length;
    const removalsCount = cases.filter((c) => c.uploader === u.name && (c.status === "removed" || c.status === "monitoring" || c.status === "closed")).length;
    const avg = 4 + (i % 6);
    const platforms = Array.from(new Set(cases.filter((c) => c.uploader === u.name).map((c) => c.platform)));
    const score = repeatOffenderScore({
      previousCases: Math.max(1, previousCases),
      reappearances: reapps,
      platforms: Math.max(1, platforms.length),
      successfulRemovals: removalsCount,
      avgTimeToReappearanceDays: avg,
    });
    return {
      id: u.entity,
      tenantId: TENANT_ID,
      name: u.name,
      kind: "uploader" as const,
      riskScore: score,
      previousCases: Math.max(1, previousCases),
      successfulRemovals: removalsCount,
      reappearances: reapps,
      avgTimeToReappearanceDays: avg,
      platforms: platforms.length ? platforms : ["Website"],
      linkedDomains: [`${u.name.toLowerCase().replace(/[^a-z]/g, "")}.example-demo.com`],
      labels: score >= 80 ? ["REPEAT OFFENDER", "CRITICAL"] : score >= 60 ? ["WATCH"] : [],
    };
  });

  const totalValue = catalogue.reduce((sum, a) => sum + a.indicativeValueInr, 0);
  const activeCaseCount = cases.filter((c) => c.status !== "closed").length;
  const financialEstimates: AppState["financialEstimates"] = [
    {
      id: `FIN-${run}-1`,
      tenantId: TENANT_ID,
      label: `${datasetLabel} — estimated exposure`,
      valueInr: totalValue * activeCaseCount,
      input: { activeCases: activeCaseCount, avgTitleValueInr: Math.round(totalValue / catalogue.length) },
      assumption: "Each active case represents one unauthorized copy in circulation at the title's indicative value.",
      formula: "active cases × indicative value per title",
      methodology: FINANCIAL_METHODOLOGY,
      methodologyVersion: FINANCIAL_VERSION,
      confidence: "medium",
      timestamp: iso(0, 9),
    },
  ];

  const notifications: AppState["notifications"] = [
    {
      id: `NTF-${run}-1`,
      tenantId: TENANT_ID,
      title: `${datasetLabel} loaded`,
      body: `${catalogue.length} titles, ${cases.length} cases and ${findings.length} findings loaded from the uploaded dataset.`,
      severity: "info",
      createdAt: iso(0, 8),
      read: false,
      href: "/cases?active=1",
      audience: "all",
    },
  ];

  const configuration: AppState["configuration"] = {
    tenantId: TENANT_ID,
    demoMode: true,
    riskThresholds: { critical: 90, high: 80, medium: 65 },
    priorityTitleWeight: 1.25,
    dashboardKpiOverrides: null,
    platforms: [
      { id: "plt-tg", tenantId: TENANT_ID, name: "Telegram", category: "messaging", defaultSlaHours: 72, supportedNoticeRoutes: ["platform_ip_form", "escalated_legal"], enabled: true },
      { id: "plt-gd", tenantId: TENANT_ID, name: "Google Drive", category: "cloud_storage", defaultSlaHours: 72, supportedNoticeRoutes: ["platform_ip_form"], enabled: true },
      { id: "plt-web", tenantId: TENANT_ID, name: "Website", category: "web", defaultSlaHours: 120, supportedNoticeRoutes: ["india_intermediary", "registrar_hosting"], enabled: true },
      { id: "plt-mkt", tenantId: TENANT_ID, name: "Marketplace", category: "marketplace", defaultSlaHours: 96, supportedNoticeRoutes: ["india_intermediary"], enabled: true },
      { id: "plt-soc", tenantId: TENANT_ID, name: "Social Media", category: "social", defaultSlaHours: 72, supportedNoticeRoutes: ["platform_ip_form"], enabled: true },
      { id: "plt-cl", tenantId: TENANT_ID, name: "Cyberlocker", category: "cyberlocker", defaultSlaHours: 120, supportedNoticeRoutes: ["registrar_hosting", "escalated_legal"], enabled: true },
    ],
    slaRules,
    escalationRules: [
      { id: "esc-sla", tenantId: TENANT_ID, trigger: "sla_breached", notifyRoles: ["legal", "lead"], createTask: true },
      { id: "esc-rea", tenantId: TENANT_ID, trigger: "reappearance", notifyRoles: ["investigator", "lead"], createTask: true },
      { id: "esc-crit", tenantId: TENANT_ID, trigger: "critical_priority", notifyRoles: ["lead", "executive"], createTask: false },
    ],
    monitoringCadence: [
      { id: "cad-c", tenantId: TENANT_ID, risk: "critical", initialDays: 30, initialCadence: "daily", thenCadence: "weekly" },
      { id: "cad-h", tenantId: TENANT_ID, risk: "high", initialDays: 30, initialCadence: "daily", thenCadence: "weekly" },
      { id: "cad-m", tenantId: TENANT_ID, risk: "medium", initialDays: 60, initialCadence: "weekly", thenCadence: "monthly" },
      { id: "cad-l", tenantId: TENANT_ID, risk: "low", initialDays: 90, initialCadence: "weekly", thenCadence: "monthly" },
    ],
    noticeTemplates: [
      { id: "tpl-ip", tenantId: TENANT_ID, route: "platform_ip_form", name: "Platform IP Form — S. Chand", body: "Complainant: S. Chand & Company Limited\nWork: {{title}} ({{isbn}})\nLocation: {{url}}" },
      { id: "tpl-in", tenantId: TENANT_ID, route: "india_intermediary", name: "India Intermediary Notice", body: "Notice under applicable intermediary guidelines. Simulated prototype template." },
    ],
    ai: {
      tenantId: TENANT_ID,
      matchModel: MODEL_MATCH,
      matchVersion: MODEL_MATCH_VERSION,
      forecastModel: "FORECAST-v0.1",
      forecastVersion: "0.1",
      promptVersion: PROMPT_VERSION,
      enabled: true,
    },
    retention: { tenantId: TENANT_ID, evidenceDays: 2555, auditDays: 2555, caseDays: 2555 },
  };

  const auditEvents: AppState["auditEvents"] = [
    {
      id: `AUD-${run}-1`,
      tenantId: TENANT_ID,
      timestamp: iso(0, 8),
      userId: "USR-TECH-01",
      userName: "B. Pradhan",
      role: "admin",
      action: "DATASET_UPLOADED",
      entity: "Dataset",
      entityId: datasetLabel,
      before: null,
      after: { titles: catalogue.length, cases: cases.length, findings: findings.length },
      ip: "10.20.30.14",
      sessionId: "sess-dataset",
    },
  ];

  return {
    tenant: { id: TENANT_ID, name: "S. Chand & Company", legalName: "S. Chand & Company Limited", environment: "prototype" },
    users,
    catalogue,
    findings,
    investigations,
    cases,
    evidence,
    custodyEvents: custody,
    rightsValidations: rights,
    legalReviews: legal,
    notices,
    submissions,
    platformResponses: responses,
    escalations,
    monitoringJobs: monitoring,
    reappearances,
    entities,
    entityRelationships: [],
    riskAssessments,
    aiAssessments,
    financialEstimates,
    auditEvents,
    notifications,
    configuration,
    connectors: [
      { id: "conn-telegram", tenantId: TENANT_ID, name: "MockTelegramConnector", kind: "telegram", status: "healthy", lastRunAt: iso(0, 8), avgMs: 420, errorRate: 0 },
      { id: "conn-web", tenantId: TENANT_ID, name: "MockWebConnector", kind: "web", status: "healthy", lastRunAt: iso(0, 8), avgMs: 610, errorRate: 0 },
      { id: "conn-market", tenantId: TENANT_ID, name: "MockMarketplaceConnector", kind: "marketplace", status: "healthy", lastRunAt: iso(0, 8), avgMs: 380, errorRate: 0 },
      { id: "conn-cloud", tenantId: TENANT_ID, name: "MockCloudStorageConnector", kind: "cloud_storage", status: "healthy", lastRunAt: iso(0, 8), avgMs: 290, errorRate: 0 },
    ],
    jobs: [],
    transitions: [],
    demo: { storyStep: 0, reappearanceSimulated: false, signatureCaseReady: false },
  };
}
