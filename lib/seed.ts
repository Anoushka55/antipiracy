import { TENANT_ID, DEMO_PASSWORD, FINANCIAL_METHODOLOGY, FINANCIAL_VERSION, MODEL_MATCH, MODEL_MATCH_VERSION, PROMPT_VERSION, RISK_METHODOLOGY, TOOL_VERSION } from "./constants";
import { hashPassword, evidenceHash } from "./hash";
import { nextSeq, resetSeq } from "./ids";
import { repeatOffenderScore, slaDueAt, slaHoursFor, slaState, daysOpen } from "./sla";
import type {
  AppState,
  CaseRecord,
  CaseStatus,
  CatalogueAsset,
  Evidence,
  Finding,
  NoticeRoute,
  PlatformCategory,
  RiskLevel,
  Role,
  User,
} from "./types";

function iso(daysAgo: number, hour = 10): string {
  const d = new Date("2026-09-04T10:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 12, 0, 0);
  return d.toISOString();
}

const TITLES: CatalogueAsset[] = [
  {
    id: "AST-0001",
    tenantId: TENANT_ID,
    title: "Mathematics for Class 10",
    isbn: "9789352533145",
    edition: "2025",
    author: "R.S. Aggarwal",
    category: "Mathematics",
    segment: "K-12 CBSE",
    priorityTitle: true,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN", "AE", "SG", "NP"],
    releaseDate: "2025-01-15",
    status: "active",
    aliases: ["RS Aggarwal Maths 10", "Class 10 Mathematics SC"],
    piracyPatterns: ["Telegram PDF dumps", "Exam-season Drive folders", "File-host mirrors"],
    indicativeValueInr: 425,
  },
  {
    id: "AST-0002",
    tenantId: TENANT_ID,
    title: "Lakhmir Singh Science Class 10",
    isbn: "9789352530281",
    edition: "2025",
    author: "Lakhmir Singh & Manjit Kaur",
    category: "Science",
    segment: "K-12 CBSE",
    priorityTitle: true,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN", "AE"],
    releaseDate: "2025-01-10",
    status: "active",
    aliases: ["Lakhmir Singh Physics/Chem/Bio 10"],
    piracyPatterns: ["Google Drive class packs", "WhatsApp forwards"],
    indicativeValueInr: 510,
  },
  {
    id: "AST-0003",
    tenantId: TENANT_ID,
    title: "English Grammar & Composition",
    isbn: "9789352530144",
    edition: "Revised",
    author: "Wren & Martin",
    category: "English",
    segment: "K-12 / Reference",
    priorityTitle: true,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN", "GB", "AE", "ZA"],
    releaseDate: "2024-06-01",
    status: "active",
    aliases: ["Wren and Martin", "High School English Grammar"],
    piracyPatterns: ["Marketplace scans", "Cyberlocker archives"],
    indicativeValueInr: 380,
  },
  {
    id: "AST-0004",
    tenantId: TENANT_ID,
    title: "NEET Preparation Series",
    isbn: "9789355018823",
    edition: "2026",
    author: "S. Chand Editorial",
    category: "Medical Entrance",
    segment: "Test Prep",
    priorityTitle: true,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN"],
    releaseDate: "2025-11-01",
    status: "active",
    aliases: ["NEET 2026 SC Series"],
    piracyPatterns: ["Telegram premium channels", "Unauthorized AI repositories"],
    indicativeValueInr: 1290,
  },
  {
    id: "AST-0005",
    tenantId: TENANT_ID,
    title: "Class 9 Mathematics",
    isbn: "9789352532278",
    edition: "2025",
    author: "R.S. Aggarwal",
    category: "Mathematics",
    segment: "K-12 CBSE",
    priorityTitle: false,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN"],
    releaseDate: "2025-01-08",
    status: "active",
    aliases: ["RS Aggarwal Maths 9"],
    piracyPatterns: ["Marketplace wholesale listings"],
    indicativeValueInr: 395,
  },
  {
    id: "AST-0006",
    tenantId: TENANT_ID,
    title: "Quantitative Aptitude",
    isbn: "9789352535088",
    edition: "2024",
    author: "R.S. Aggarwal",
    category: "Competitive Exams",
    segment: "Test Prep",
    priorityTitle: true,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN", "AE"],
    releaseDate: "2024-03-12",
    status: "active",
    aliases: ["RS Aggarwal QA"],
    piracyPatterns: ["Cyberlocker packs", "Social media PDF shares"],
    indicativeValueInr: 620,
  },
  {
    id: "AST-0007",
    tenantId: TENANT_ID,
    title: "Physics for Class 12",
    isbn: "9789355014412",
    edition: "2025",
    author: "S. Chand Physics Faculty",
    category: "Physics",
    segment: "K-12 CBSE",
    priorityTitle: false,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN"],
    releaseDate: "2025-02-01",
    status: "active",
    aliases: ["SC Physics 12"],
    piracyPatterns: ["Drive class folders"],
    indicativeValueInr: 455,
  },
  {
    id: "AST-0008",
    tenantId: TENANT_ID,
    title: "Chemistry for Class 11",
    isbn: "9789355013309",
    edition: "2025",
    author: "S. Chand Chemistry Faculty",
    category: "Chemistry",
    segment: "K-12 CBSE",
    priorityTitle: false,
    rightsOwner: "S. Chand & Company Limited",
    territories: ["IN"],
    releaseDate: "2025-02-01",
    status: "active",
    aliases: ["SC Chemistry 11"],
    piracyPatterns: ["Exam-season PDF sharing"],
    indicativeValueInr: 440,
  },
];

const PLATFORMS: { name: string; cat: PlatformCategory; country: string }[] = [
  { name: "Telegram", cat: "messaging", country: "AE" },
  { name: "Google Drive", cat: "cloud_storage", country: "US" },
  { name: "Website", cat: "web", country: "IN" },
  { name: "Marketplace", cat: "marketplace", country: "IN" },
  { name: "Social Media", cat: "social", country: "IN" },
  { name: "Cyberlocker", cat: "cyberlocker", country: "NL" },
];

const UPLOADERS = [
  { name: "AcademicLeaks_IN", entity: "ENT-0001" },
  { name: "FreeStudyHub", entity: "ENT-0002" },
  { name: "CBSE_NotesHub", entity: "ENT-0003" },
  { name: "EduBooks Wholesale", entity: "ENT-0004" },
  { name: "PDFBay_Admin", entity: "ENT-0005" },
  { name: "ExamSeason_Share", entity: "ENT-0006" },
  { name: "StudyVault_Admin", entity: "ENT-0007" },
  { name: "TeleBooks_04", entity: "ENT-0008" },
];

function user(id: string, name: string, title: string, email: string, role: Role): User {
  return {
    id,
    tenantId: TENANT_ID,
    name,
    title,
    email,
    role,
    passwordHash: hashPassword(DEMO_PASSWORD),
    active: true,
  };
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CASE_FLOW: { status: CaseStatus; needsNotice: boolean; needsResponse: boolean; needsMonitor: boolean }[] = [
  { status: "new", needsNotice: false, needsResponse: false, needsMonitor: false },
  { status: "investigating", needsNotice: false, needsResponse: false, needsMonitor: false },
  { status: "rights_validation", needsNotice: false, needsResponse: false, needsMonitor: false },
  { status: "legal_review", needsNotice: false, needsResponse: false, needsMonitor: false },
  { status: "legal_approved", needsNotice: false, needsResponse: false, needsMonitor: false },
  { status: "notice_ready", needsNotice: true, needsResponse: false, needsMonitor: false },
  { status: "submitted", needsNotice: true, needsResponse: false, needsMonitor: false },
  { status: "awaiting_response", needsNotice: true, needsResponse: false, needsMonitor: false },
  { status: "removed", needsNotice: true, needsResponse: true, needsMonitor: true },
  { status: "monitoring", needsNotice: true, needsResponse: true, needsMonitor: true },
  { status: "closed", needsNotice: true, needsResponse: true, needsMonitor: true },
  { status: "escalated", needsNotice: true, needsResponse: false, needsMonitor: false },
  { status: "approved_hold", needsNotice: false, needsResponse: false, needsMonitor: false },
];

function routeFor(platform: string): NoticeRoute {
  if (platform === "Telegram" || platform === "Google Drive") return "platform_ip_form";
  if (platform === "Marketplace") return "india_intermediary";
  if (platform === "Cyberlocker") return "registrar_hosting";
  return "india_intermediary";
}

export function buildSeed(): AppState {
  resetSeq(2000);
  const rng = mulberry32(20260901);
  const slaRules = [
    { id: "sla-c", tenantId: TENANT_ID, risk: "critical" as const, hours: 24 },
    { id: "sla-h", tenantId: TENANT_ID, risk: "high" as const, hours: 48 },
    { id: "sla-m", tenantId: TENANT_ID, risk: "medium" as const, hours: 120 },
    { id: "sla-l", tenantId: TENANT_ID, risk: "low" as const, hours: 240 },
  ];

  const users: User[] = [
    user("USR-EXEC-01", "Mr. Sourabh", "CFO / CXO Group", "sourabh@schand.demo", "executive"),
    user("USR-LEAD-01", "Mr. Murli", "Anti-Piracy Lead", "murli@schand.demo", "lead"),
    user("USR-TECH-01", "B. Pradhan", "Technology Lead", "b.pradhan@schand.demo", "admin"),
    user("USR-INV-01", "Investigator 01", "Anti-Piracy Investigator", "inv01@schand.demo", "investigator"),
    user("USR-INV-02", "Enforcement Analyst 02", "Enforcement Analyst", "inv02@schand.demo", "investigator"),
    user("USR-LEG-01", "Legal Reviewer 01", "Legal Counsel", "legal@schand.demo", "legal"),
    user("USR-OPS-01", "Platform Operations 01", "Enforcement Dispatcher", "ops@schand.demo", "operations"),
  ];

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
  const transitions: AppState["transitions"] = [];
  const aiAssessments: AppState["aiAssessments"] = [];
  const riskAssessments: AppState["riskAssessments"] = [];
  const notifications: AppState["notifications"] = [];

  const signatureFinding: Finding = {
    id: "FND-2026-1092",
    tenantId: TENANT_ID,
    detectedAt: iso(3, 8),
    platform: "Telegram",
    platformCategory: "messaging",
    url: "https://t.me/cbse_free_books/4401",
    suspectedTitle: "Mathematics for Class 10",
    assetId: "AST-0001",
    uploader: "AcademicLeaks_IN",
    entityId: "ENT-0001",
    matchScore: 98,
    aiConfidence: 96,
    priority: "critical",
    risk: "critical",
    status: "promoted",
    assignedInvestigatorId: "USR-INV-02",
    hostingCountry: "AE",
    watermarkDetected: true,
    ocrSimilarity: 97,
    metadata: {
      pages: 428,
      fileSizeKb: 12480,
      isbnDetected: "9789352533145",
      channel: "cbse_free_books",
    },
    relatedFindingIds: [],
    relatedCaseId: "SC-2026-0842",
    notes: "Flagship title. High-confidence match with watermark.",
    sourceConnector: "MockTelegramConnector",
    jobId: null,
  };
  findings.push(signatureFinding);

  findings.push({
    id: "FND-2026-1093",
    tenantId: TENANT_ID,
    detectedAt: iso(2, 11),
    platform: "Google Drive",
    platformCategory: "cloud_storage",
    url: "https://drive.google.com/file/d/demo-lakhmir-class10/view",
    suspectedTitle: "Lakhmir Singh Science Class 10",
    assetId: "AST-0002",
    uploader: "FreeStudyHub",
    entityId: "ENT-0002",
    matchScore: 94,
    aiConfidence: 93,
    priority: "high",
    risk: "high",
    status: "ai_flagged",
    assignedInvestigatorId: "USR-INV-01",
    hostingCountry: "US",
    watermarkDetected: true,
    ocrSimilarity: 92,
    metadata: { folder: "CBSE_Class10_Pack", files: 6 },
    relatedFindingIds: [],
    relatedCaseId: null,
    notes: "",
    sourceConnector: "MockCloudStorageConnector",
    jobId: null,
  });

  findings.push({
    id: "FND-2026-1094",
    tenantId: TENANT_ID,
    detectedAt: iso(2, 14),
    platform: "Marketplace",
    platformCategory: "marketplace",
    url: "https://market.example-demo.com/listing/edu-wholesale-rs9",
    suspectedTitle: "Class 9 Mathematics",
    assetId: "AST-0005",
    uploader: "EduBooks Wholesale",
    entityId: "ENT-0004",
    matchScore: 89,
    aiConfidence: 86,
    priority: "high",
    risk: "high",
    status: "needs_validation",
    assignedInvestigatorId: "USR-INV-01",
    hostingCountry: "IN",
    watermarkDetected: false,
    ocrSimilarity: 81,
    metadata: { listingPrice: 90, condition: "scanned PDF" },
    relatedFindingIds: [],
    relatedCaseId: null,
    notes: "",
    sourceConnector: "MockMarketplaceConnector",
    jobId: null,
  });

  for (let i = 0; i < 97; i++) {
    const t = TITLES[i % TITLES.length];
    const p = PLATFORMS[i % PLATFORMS.length];
    const u = UPLOADERS[i % UPLOADERS.length];
    const match = 68 + Math.floor(rng() * 30);
    const risk: RiskLevel = match >= 95 ? "critical" : match >= 88 ? "high" : match >= 78 ? "medium" : "low";
    const statuses: Finding["status"][] = ["new", "ai_flagged", "needs_validation", "validated", "promoted", "rejected"];
    const status = i < 34 ? "new" : statuses[i % statuses.length];
    const n = 1100 + i >= 1148 ? 1101 + i : 1100 + i; // 1148 reserved for signature reappearance
    findings.push({
      id: `FND-2026-${n}`,
      tenantId: TENANT_ID,
      detectedAt: iso((i % 21) + 1, 8 + (i % 10)),
      platform: p.name,
      platformCategory: p.cat,
      url: `https://example-demo.com/${p.cat}/${t.id.toLowerCase()}/${n}`,
      suspectedTitle: t.title,
      assetId: t.id,
      uploader: u.name,
      entityId: u.entity,
      matchScore: match,
      aiConfidence: Math.min(99, match + Math.floor(rng() * 4)),
      priority: t.priorityTitle && match >= 90 ? "critical" : risk,
      risk,
      status,
      assignedInvestigatorId: i % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
      hostingCountry: p.country,
      watermarkDetected: rng() > 0.45,
      ocrSimilarity: Math.max(60, match - 4),
      metadata: { simulated: true, region: p.country },
      relatedFindingIds: [],
      relatedCaseId: null,
      notes: "",
      sourceConnector:
        p.cat === "messaging"
          ? "MockTelegramConnector"
          : p.cat === "marketplace"
            ? "MockMarketplaceConnector"
            : p.cat === "cloud_storage"
              ? "MockCloudStorageConnector"
              : "MockWebConnector",
      jobId: null,
    });
  }

  const newCount = findings.filter((f) => f.status === "new").length;
  if (newCount < 37) {
    findings.filter((f) => f.status !== "promoted" && f.id !== "FND-2026-1092").slice(0, 37 - newCount).forEach((f) => {
      f.status = "new";
    });
  }

  function addEvidence(caseId: string, findingId: string, n: number, url: string) {
    const ids: string[] = [];
    for (let k = 0; k < n; k++) {
      const eid = caseId === "SC-2026-0842" && k === 0 ? "EV-0842-A" : `EV-${caseId.slice(-4)}-${k === 0 ? "A" : "B"}`;
      const capturedAt = iso(2, 9 + k);
      const rec: Evidence = {
        id: eid,
        tenantId: TENANT_ID,
        caseId,
        findingId,
        type: k === 0 ? "pdf_binary" : "screenshot",
        sourceUrl: url,
        capturedAt,
        capturedBy: "USR-INV-02",
        toolVersion: TOOL_VERSION,
        sha256: evidenceHash({ id: eid, sourceUrl: url, capturedAt, type: k === 0 ? "pdf_binary" : "screenshot" }),
        storageLocation: `s3://schand-evidence-demo/${caseId}/${eid}`,
        chainOfCustodyStatus: "intact",
        integrity: "verified",
        relatedEvidenceId: null,
        metadata: { pages: 428, bytes: 12780000 + k },
        previewLabel: k === 0 ? "PDF Binary" : "Screenshot capture",
      };
      evidence.push(rec);
      ids.push(eid);
      (["captured", "hash_generated", "stored"] as const).forEach((event, idx) => {
        custody.push({
          id: `CUS-${nextSeq()}`,
          tenantId: TENANT_ID,
          evidenceId: eid,
          event,
          actorId: "USR-INV-02",
          timestamp: iso(2, 9 + k),
          detail: `${event.replace("_", " ")} for ${eid}`,
        });
        void idx;
      });
    }
    return ids;
  }

  const signatureCreated = iso(3, 9);
  const sigSla = slaHoursFor("critical", slaRules, 72);
  const signatureCase: CaseRecord = {
    id: "SC-2026-0842",
    tenantId: TENANT_ID,
    findingId: "FND-2026-1092",
    investigationId: "INV-0842",
    assetId: "AST-0001",
    title: "Mathematics for Class 10",
    platform: "Telegram",
    url: "https://t.me/cbse_free_books/4401",
    uploader: "AcademicLeaks_IN",
    entityId: "ENT-0001",
    risk: "critical",
    priority: "critical",
    ownerId: "USR-INV-02",
    status: "removed",
    noticeRoute: "platform_ip_form",
    daysOpen: daysOpen(signatureCreated),
    slaHours: sigSla,
    slaDueAt: slaDueAt(signatureCreated, sigSla),
    slaState: slaState(signatureCreated, sigSla, new Date("2026-09-04T10:00:00Z")),
    reappearance: false,
    lastAction: "Content removed — monitoring remains active",
    lastActionAt: iso(1, 16),
    createdAt: signatureCreated,
    hostingCountry: "AE",
    parentCaseId: null,
    evidenceIds: [],
    noticeId: "NTC-0842",
    submissionId: "SUB-0842",
    monitoringJobId: "MON-0842",
  };
  signatureCase.evidenceIds = addEvidence("SC-2026-0842", "FND-2026-1092", 2, signatureCase.url);
  cases.push(signatureCase);

  investigations.push({
    id: "INV-0842",
    tenantId: TENANT_ID,
    findingId: "FND-2026-1092",
    caseId: "SC-2026-0842",
    investigatorId: "USR-INV-02",
    status: "confirmed",
    notes: [
      "Confirmed material reproduction of Mathematics for Class 10 (R.S. Aggarwal).",
      "Watermark and ISBN match catalogue record AST-0001.",
    ],
    createdAt: iso(3, 9),
    updatedAt: iso(3, 11),
  });

  rights.push({
    id: "RV-0842",
    tenantId: TENANT_ID,
    caseId: "SC-2026-0842",
    gates: {
      rightsOwnership: "pass",
      infringementSubstantiated: "pass",
      authorization: "pass",
      actionableTarget: "pass",
    },
    inheritedFromCaseId: null,
    confirmationRequired: false,
    confirmed: true,
    reviewerId: "USR-LEG-01",
    reviewedAt: iso(3, 12),
    notes: "4/4 gates passed. S. Chand is rights owner for IN/AE territories.",
    title: "Mathematics for Class 10",
    isbn: "9789352533145",
    edition: "2025",
    author: "R.S. Aggarwal",
    rightsOwner: "S. Chand & Company Limited",
    territory: "IN / AE",
  });

  legal.push({
    id: "LR-0842",
    tenantId: TENANT_ID,
    caseId: "SC-2026-0842",
    reviewerId: "USR-LEG-01",
    status: "approved",
    jurisdiction: "India — Intermediary / Platform IP",
    recommendedRoute: "platform_ip_form",
    routeConfidence: "high",
    routeReason: "Target platform supports structured IP reporting.",
    approvedAt: iso(2, 10),
    notes: "Approved for Telegram Platform Takedown + Grievance Officer route.",
  });

  notices.push({
    id: "NTC-0842",
    tenantId: TENANT_ID,
    caseId: "SC-2026-0842",
    route: "platform_ip_form",
    status: "dispatched",
    complainant: "S. Chand & Company Limited",
    copyrightedWork: "Mathematics for Class 10 — R.S. Aggarwal — ISBN 9789352533145",
    ownership: "S. Chand & Company Limited is the exclusive rights owner for the identified territories.",
    infringingMaterial: "Unauthorized PDF reproduction distributed via Telegram channel cbse_free_books.",
    location: "https://t.me/cbse_free_books/4401",
    description:
      "The listed URL makes available a high-fidelity unauthorized copy of a priority S. Chand title.",
    goodFaithDeclaration:
      "The information in this notice is accurate, and under penalty of perjury the complainant is authorized to act on behalf of the rights owner. This is a simulated prototype notice and is not a live legal filing.",
    authorization: "Authorized by Legal Reviewer 01 on 2026-09-02.",
    signature: "Legal Reviewer 01 / S. Chand Legal (demo)",
    generatedAt: iso(2, 11),
    approvedBy: "USR-LEG-01",
    approvedAt: iso(2, 12),
  });

  submissions.push({
    id: "SUB-0842",
    tenantId: TENANT_ID,
    caseId: "SC-2026-0842",
    noticeId: "NTC-0842",
    ticketId: "TG-IP-72842",
    destination: "Telegram IP reporting workflow",
    status: "removed",
    submittedAt: iso(2, 13),
    submittedBy: "USR-OPS-01",
    simulated: true,
  });

  responses.push({
    id: "PR-0842",
    tenantId: TENANT_ID,
    submissionId: "SUB-0842",
    caseId: "SC-2026-0842",
    outcome: "removed",
    receivedAt: iso(1, 16),
    summary: "SIMULATED RESPONSE — content reported as removed by platform.",
    simulated: true,
  });

  monitoring.push({
    id: "MON-0842",
    tenantId: TENANT_ID,
    caseId: "SC-2026-0842",
    status: "active",
    windowDays: 30,
    cadence: "daily",
    startedAt: iso(1, 16),
    nextScanAt: "2026-09-05T09:00:00.000Z",
    lastScanAt: iso(0, 9),
  });

  signatureCase.status = "monitoring";

  const sigFlow: CaseStatus[] = [
    "new",
    "investigating",
    "rights_validation",
    "legal_review",
    "legal_approved",
    "notice_ready",
    "submitted",
    "awaiting_response",
    "removed",
    "monitoring",
  ];
  sigFlow.forEach((to, i) => {
    transitions.push({
      id: `TR-0842-${i}`,
      tenantId: TENANT_ID,
      caseId: "SC-2026-0842",
      from: i === 0 ? null : sigFlow[i - 1],
      to,
      actorId: i < 4 ? "USR-INV-02" : i < 6 ? "USR-LEG-01" : "USR-OPS-01",
      timestamp: iso(3 - Math.min(i, 3), 10 + i),
      reason: `Transition to ${to}`,
    });
  });

  custody.push({
    id: "CUS-0842-L",
    tenantId: TENANT_ID,
    evidenceId: "EV-0842-A",
    event: "legal_reviewed",
    actorId: "USR-LEG-01",
    timestamp: iso(2, 10),
    detail: "Legal reviewed evidence package",
  });
  custody.push({
    id: "CUS-0842-N",
    tenantId: TENANT_ID,
    evidenceId: "EV-0842-A",
    event: "notice_attached",
    actorId: "USR-LEG-01",
    timestamp: iso(2, 12),
    detail: "Notice NTC-0842 attached",
  });

  aiAssessments.push({
    id: "AI-0842",
    tenantId: TENANT_ID,
    subjectType: "finding",
    subjectId: "FND-2026-1092",
    recommendation: "LIKELY INFRINGEMENT",
    confidence: 0.96,
    model: MODEL_MATCH,
    version: MODEL_MATCH_VERSION,
    promptVersion: PROMPT_VERSION,
    timestamp: iso(3, 8),
    inputs: { matchScore: 98, ocr: 97, watermark: true, isbn: "9789352533145" },
    methodology: "Synthetic similarity model combining OCR, metadata and watermark indicators.",
    humanValidationRequired: true,
  });

  const extraCaseFindings = findings
    .filter((f) => f.id !== "FND-2026-1092")
    .slice(-39);

  extraCaseFindings.forEach((f, idx) => {
    const flow = CASE_FLOW[idx % CASE_FLOW.length];
    const createdAt = f.detectedAt;
    const slaHours = slaHoursFor(f.risk, slaRules, f.platform === "Telegram" ? 72 : undefined);
    const caseId = `SC-2026-${900 + idx}`;
    f.status = "promoted";
    f.relatedCaseId = caseId;
    const invId = `INV-${900 + idx}`;
    const evIds = addEvidence(caseId, f.id, idx % 3 === 0 ? 2 : 1, f.url);
    const rec: CaseRecord = {
      id: caseId,
      tenantId: TENANT_ID,
      findingId: f.id,
      investigationId: invId,
      assetId: f.assetId,
      title: f.suspectedTitle,
      platform: f.platform,
      url: f.url,
      uploader: f.uploader,
      entityId: f.entityId,
      risk: f.risk,
      priority: f.priority,
      ownerId: idx % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
      status: flow.status,
      noticeRoute: flow.needsNotice ? routeFor(f.platform) : idx % 5 === 0 ? routeFor(f.platform) : null,
      daysOpen: daysOpen(createdAt, new Date("2026-09-04T10:00:00Z")),
      slaHours,
      slaDueAt: slaDueAt(createdAt, slaHours),
      slaState: slaState(createdAt, slaHours, new Date("2026-09-04T10:00:00Z")),
      reappearance: false,
      lastAction: `Status ${flow.status}`,
      lastActionAt: createdAt,
      createdAt,
      hostingCountry: f.hostingCountry,
      parentCaseId: null,
      evidenceIds: evIds,
      noticeId: null,
      submissionId: null,
      monitoringJobId: null,
    };

    investigations.push({
      id: invId,
      tenantId: TENANT_ID,
      findingId: f.id,
      caseId,
      investigatorId: rec.ownerId,
      status: flow.status === "rejected" ? "false_positive" : "confirmed",
      notes: [`Investigation opened for ${f.suspectedTitle}`],
      createdAt,
      updatedAt: createdAt,
    });

    if (["rights_validation", "legal_review", "legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated"].includes(flow.status)) {
      const pass = flow.status !== "approved_hold";
      rights.push({
        id: `RV-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        gates: {
          rightsOwnership: "pass",
          infringementSubstantiated: pass ? "pass" : "hold",
          authorization: "pass",
          actionableTarget: pass ? "pass" : "hold",
        },
        inheritedFromCaseId: null,
        confirmationRequired: false,
        confirmed: pass,
        reviewerId: "USR-LEG-01",
        reviewedAt: createdAt,
        notes: pass ? "4/4 validated" : "Hold — further clarification",
        title: f.suspectedTitle,
        isbn: TITLES.find((t) => t.id === f.assetId)?.isbn ?? "",
        edition: "2025",
        author: TITLES.find((t) => t.id === f.assetId)?.author ?? "",
        rightsOwner: "S. Chand & Company Limited",
        territory: "IN",
      });
    }

    if (["legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated"].includes(flow.status)) {
      legal.push({
        id: `LR-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        reviewerId: "USR-LEG-01",
        status: flow.status === "approved_hold" ? "hold" : "approved",
        jurisdiction: "India",
        recommendedRoute: routeFor(f.platform),
        routeConfidence: "high",
        routeReason: "Configured route for platform.",
        approvedAt: createdAt,
        notes: "",
      });
    }

    if (flow.needsNotice) {
      const nid = `NTC-${900 + idx}`;
      rec.noticeId = nid;
      notices.push({
        id: nid,
        tenantId: TENANT_ID,
        caseId,
        route: routeFor(f.platform),
        status: flow.status === "notice_ready" ? "approved" : "dispatched",
        complainant: "S. Chand & Company Limited",
        copyrightedWork: `${f.suspectedTitle}`,
        ownership: "S. Chand & Company Limited",
        infringingMaterial: `Unauthorized copy at ${f.url}`,
        location: f.url,
        description: "Unauthorized distribution of a S. Chand protected work.",
        goodFaithDeclaration: "Simulated prototype notice — not a live legal filing.",
        authorization: "Legal Reviewer 01",
        signature: "Legal Reviewer 01 (demo)",
        generatedAt: createdAt,
        approvedBy: "USR-LEG-01",
        approvedAt: createdAt,
      });
      const sid = `SUB-${900 + idx}`;
      rec.submissionId = sid;
      if (["submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated"].includes(flow.status)) {
        submissions.push({
          id: sid,
          tenantId: TENANT_ID,
          caseId,
          noticeId: nid,
          ticketId: `${f.platform.slice(0, 2).toUpperCase()}-IP-${70000 + idx}`,
          destination: `${f.platform} IP reporting workflow`,
          status: flow.status === "removed" || flow.status === "monitoring" || flow.status === "closed" ? "removed" : "awaiting_response",
          submittedAt: createdAt,
          submittedBy: "USR-OPS-01",
          simulated: true,
        });
      }
    }

    if (flow.needsResponse) {
      responses.push({
        id: `PR-${900 + idx}`,
        tenantId: TENANT_ID,
        submissionId: rec.submissionId ?? `SUB-${900 + idx}`,
        caseId,
        outcome: "removed",
        receivedAt: createdAt,
        summary: "SIMULATED RESPONSE — removed",
        simulated: true,
      });
    }

    if (flow.needsMonitor) {
      const mid = `MON-${900 + idx}`;
      rec.monitoringJobId = mid;
      monitoring.push({
        id: mid,
        tenantId: TENANT_ID,
        caseId,
        status: flow.status === "closed" ? "completed" : "active",
        windowDays: f.risk === "critical" || f.risk === "high" ? 30 : f.risk === "medium" ? 60 : 90,
        cadence: f.risk === "critical" || f.risk === "high" ? "daily" : f.risk === "medium" ? "weekly" : "monthly",
        startedAt: createdAt,
        nextScanAt: iso(0, 9),
        lastScanAt: createdAt,
      });
    }

    if (flow.status === "escalated") {
      escalations.push({
        id: `ESC-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        reason: "SLA breached — escalation required",
        createdAt,
        status: "open",
        notifyRoles: ["legal", "lead"],
        recommendedRoute: "escalated_legal",
      });
    }

    cases.push(rec);
  });

  const monitorCases = [
    ...cases.filter((c) => c.status === "monitoring" || c.status === "closed" || c.status === "removed"),
    ...cases.filter((c) => c.id !== "SC-2026-0842"),
  ]
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .filter((c) => c.id !== "SC-2026-0842")
    .slice(0, 15);
  monitorCases.forEach((c, i) => {
    const f: Finding = {
      id: `FND-2026-${1400 + i}`,
      tenantId: TENANT_ID,
      detectedAt: iso(i % 6, 8),
      platform: i % 2 === 0 ? "Website" : c.platform,
      platformCategory: i % 2 === 0 ? "web" : (PLATFORMS.find((p) => p.name === c.platform)?.cat ?? "web"),
      url: `https://mirror.example-demo.com/${c.assetId.toLowerCase()}/${1400 + i}`,
      suspectedTitle: c.title,
      assetId: c.assetId,
      uploader: i % 3 === 0 ? "StudyVault_Admin" : c.uploader,
      entityId: i % 3 === 0 ? "ENT-0007" : c.entityId,
      matchScore: 90 + (i % 8),
      aiConfidence: 92,
      priority: c.priority,
      risk: c.risk,
      status: "linked_reappearance",
      assignedInvestigatorId: c.ownerId,
      hostingCountry: "IN",
      watermarkDetected: true,
      ocrSimilarity: 91,
      metadata: { mirror: true },
      relatedFindingIds: [c.findingId],
      relatedCaseId: c.id,
      notes: "Linked reappearance of prior enforcement.",
      sourceConnector: "MockWebConnector",
      jobId: null,
    };
    findings.push(f);
    c.reappearance = true;
    reappearances.push({
      id: `REA-${1400 + i}`,
      tenantId: TENANT_ID,
      originalCaseId: c.id,
      newFindingId: f.id,
      originalUrl: c.url,
      newUrl: f.url,
      platform: f.platform,
      uploader: f.uploader,
      similarity: f.matchScore,
      titleSimilarity: 98,
      isbnMatch: true,
      fingerprintMatch: true,
      watermarkMatch: true,
      relationship: "likely_mirror",
      detectedAt: f.detectedAt,
      confidence: 0.9 + i / 200,
      reasons: ["Same ISBN", "Same protected asset", "High content similarity"],
      confirmed: i % 2 === 0,
    });
  });

  while (escalations.length < 10) {
    const c = cases.find((x) => x.slaState === "breached" && !escalations.some((e) => e.caseId === x.id)) ?? cases[escalations.length + 3];
    escalations.push({
      id: `ESC-X-${escalations.length}`,
      tenantId: TENANT_ID,
      caseId: c.id,
      reason: "SLA approaching / breached",
      createdAt: iso(1, 12),
      status: escalations.length % 3 === 0 ? "resolved" : "open",
      notifyRoles: ["lead", "legal"],
      recommendedRoute: "escalated_legal",
    });
  }

  const entities: AppState["entities"] = UPLOADERS.map((u, i) => {
    const previousCases = [12, 7, 5, 9, 6, 4, 7, 3][i];
    const reapps = [5, 3, 2, 4, 2, 1, 4, 1][i];
    const removals = [9, 6, 4, 7, 5, 3, 6, 2][i];
    const avg = [4.2, 6.1, 8.0, 5.4, 7.2, 9.5, 4.8, 11][i];
    const platforms = i % 2 === 0 ? ["Telegram", "Website", "File Host"] : ["Google Drive", "Marketplace"];
    const score = repeatOffenderScore({
      previousCases,
      reappearances: reapps,
      platforms: platforms.length,
      successfulRemovals: removals,
      avgTimeToReappearanceDays: avg,
    });
    return {
      id: u.entity,
      tenantId: TENANT_ID,
      name: u.name,
      kind: i === 3 ? "marketplace_seller" : i === 0 || i === 2 ? "telegram_channel" : "uploader",
      riskScore: i === 0 || i === 6 ? 89 : score,
      previousCases,
      successfulRemovals: removals,
      reappearances: reapps,
      avgTimeToReappearanceDays: avg,
      platforms,
      linkedDomains: [`${u.name.toLowerCase().replace(/[^a-z]/g, "")}.example-demo.com`],
      labels: score >= 80 ? ["REPEAT OFFENDER", "CRITICAL"] : score >= 60 ? ["WATCH"] : [],
    };
  });

  entities.push({
    id: "ENT-0009",
    tenantId: TENANT_ID,
    name: "files.example-demo.com",
    kind: "domain",
    riskScore: 74,
    previousCases: 6,
    successfulRemovals: 4,
    reappearances: 3,
    avgTimeToReappearanceDays: 5.1,
    platforms: ["Independent File Host"],
    linkedDomains: ["files.example-demo.com"],
    labels: ["WATCH"],
  });

  const entityRelationships = [
    { id: "REL-1", tenantId: TENANT_ID, fromEntityId: "ENT-0001", toEntityId: "ENT-0007", type: "same_operator" as const, weight: 0.72 },
    { id: "REL-2", tenantId: TENANT_ID, fromEntityId: "ENT-0001", toEntityId: "ENT-0003", type: "linked_channel" as const, weight: 0.61 },
    { id: "REL-3", tenantId: TENANT_ID, fromEntityId: "ENT-0007", toEntityId: "ENT-0009", type: "mirror_of" as const, weight: 0.81 },
    { id: "REL-4", tenantId: TENANT_ID, fromEntityId: "ENT-0002", toEntityId: "ENT-0005", type: "related" as const, weight: 0.44 },
    { id: "REL-5", tenantId: TENANT_ID, fromEntityId: "ENT-0004", toEntityId: "ENT-0006", type: "shared_payment" as const, weight: 0.39 },
  ];

  cases.filter((c) => c.risk === "critical" || c.risk === "high").slice(0, 40).forEach((c) => {
    riskAssessments.push({
      id: `RSK-${c.id}`,
      tenantId: TENANT_ID,
      subjectType: "case",
      subjectId: c.id,
      score: c.risk === "critical" ? 92 : 78,
      level: c.risk,
      input: { match: findings.find((f) => f.id === c.findingId)?.matchScore, priorityTitle: TITLES.find((t) => t.id === c.assetId)?.priorityTitle },
      assumption: "Priority title weight applied when catalogue flag is set.",
      methodology: RISK_METHODOLOGY,
      methodologyVersion: "RSK-v0.1",
      confidence: 0.82,
      timestamp: c.createdAt,
    });
  });

  notifications.push(
    {
      id: "NTF-1",
      tenantId: TENANT_ID,
      title: "14 priority-title cases require management attention",
      body: "CRITICAL — flagship S. Chand titles remain exposed across Telegram and Drive.",
      severity: "critical",
      createdAt: iso(0, 8),
      read: false,
      href: "/cases?risk=critical",
      audience: "all",
    },
    {
      id: "NTF-2",
      tenantId: TENANT_ID,
      title: "7 SLA breaches require escalation",
      body: "HIGH — enforcement SLAs have been exceeded.",
      severity: "high",
      createdAt: iso(0, 8),
      read: false,
      href: "/enforcement",
      audience: ["lead", "legal", "operations"],
    },
    {
      id: "NTF-3",
      tenantId: TENANT_ID,
      title: "Piracy exposure increased 18% over the previous 7-day period",
      body: "EMERGING — exam-season PDF sharing is the primary driver (synthetic).",
      severity: "high",
      createdAt: iso(0, 7),
      read: false,
      href: "/analytics",
      audience: "all",
    }
  );

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
      { id: "plt-fh", tenantId: TENANT_ID, name: "Independent File Host", category: "cyberlocker", defaultSlaHours: 72, supportedNoticeRoutes: ["registrar_hosting", "india_intermediary"], enabled: true },
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
      {
        id: "tpl-ip",
        tenantId: TENANT_ID,
        route: "platform_ip_form",
        name: "Platform IP Form — S. Chand",
        body: "Complainant: S. Chand & Company Limited\nWork: {{title}} ({{isbn}})\nLocation: {{url}}",
      },
      {
        id: "tpl-in",
        tenantId: TENANT_ID,
        route: "india_intermediary",
        name: "India Intermediary Notice",
        body: "Notice under applicable intermediary guidelines. Simulated prototype template.",
      },
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
      id: "AUD-SEED-1",
      tenantId: TENANT_ID,
      timestamp: iso(3, 8),
      userId: "USR-INV-02",
      userName: "Enforcement Analyst 02",
      role: "investigator" as Role,
      action: "FINDING_CREATED",
      entity: "Finding",
      entityId: "FND-2026-1092",
      before: null,
      after: { status: "new" },
      ip: "10.20.30.14",
      sessionId: "sess-seed",
    },
    {
      id: "AUD-SEED-2",
      tenantId: TENANT_ID,
      timestamp: iso(2, 13),
      userId: "USR-OPS-01",
      userName: "Platform Operations 01",
      role: "operations" as Role,
      action: "NOTICE_SUBMITTED",
      entity: "Submission",
      entityId: "TG-IP-72842",
      before: { status: "notice_ready" },
      after: { status: "submitted", simulated: true },
      ip: "10.20.30.21",
      sessionId: "sess-seed",
    },
  ];

  return {
    tenant: {
      id: TENANT_ID,
      name: "S. Chand & Company",
      legalName: "S. Chand & Company Limited",
      environment: "prototype",
    },
    users,
    catalogue: TITLES,
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
    entityRelationships,
    riskAssessments,
    aiAssessments,
    financialEstimates: [
      {
        id: "FIN-EXP-1",
        tenantId: TENANT_ID,
        label: "Estimated Exposure",
        valueInr: 186060000,
        input: {
          estimatedUnauthorizedCopies: 420000,
          indicativeRealizationInr: 443,
          priorityTitleShare: 0.64,
        },
        assumption: "Estimated unauthorized distribution × indicative realization value. Illustrative only.",
        formula: "copies × indicative_value_inr",
        methodology: FINANCIAL_METHODOLOGY,
        methodologyVersion: FINANCIAL_VERSION,
        confidence: "medium",
        timestamp: iso(0, 8),
      },
    ],
    auditEvents,
    notifications,
    configuration,
    connectors: [
      { id: "conn-telegram", tenantId: TENANT_ID, name: "MockTelegramConnector", kind: "telegram", status: "healthy", lastRunAt: iso(0, 8), avgMs: 420, errorRate: 0 },
      { id: "conn-web", tenantId: TENANT_ID, name: "MockWebConnector", kind: "web", status: "healthy", lastRunAt: iso(0, 8), avgMs: 610, errorRate: 0.01 },
      { id: "conn-market", tenantId: TENANT_ID, name: "MockMarketplaceConnector", kind: "marketplace", status: "warning", lastRunAt: iso(0, 6), avgMs: 980, errorRate: 0.08 },
      { id: "conn-cloud", tenantId: TENANT_ID, name: "MockCloudStorageConnector", kind: "cloud_storage", status: "healthy", lastRunAt: iso(0, 8), avgMs: 540, errorRate: 0 },
    ],
    jobs: [],
    transitions,
    demo: { storyStep: 0, reappearanceSimulated: false, signatureCaseReady: true },
  };
}

export { TITLES as CATALOGUE_SEED };
