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

// Exported for lib/dataset-seed.ts, which builds a second, uploadable AppState
// using the same platform/uploader mix and helpers as the main demo seed.
export const PLATFORMS: { name: string; cat: PlatformCategory; country: string }[] = [
  { name: "Telegram", cat: "messaging", country: "AE" },
  { name: "Google Drive", cat: "cloud_storage", country: "US" },
  { name: "Website", cat: "web", country: "IN" },
  { name: "Marketplace", cat: "marketplace", country: "IN" },
  { name: "Social Media", cat: "social", country: "IN" },
  { name: "Cyberlocker", cat: "cyberlocker", country: "NL" },
];

export const UPLOADERS = [
  { name: "AcademicLeaks_IN", entity: "ENT-0001" },
  { name: "FreeStudyHub", entity: "ENT-0002" },
  { name: "CBSE_NotesHub", entity: "ENT-0003" },
  { name: "EduBooks Wholesale", entity: "ENT-0004" },
  { name: "PDFBay_Admin", entity: "ENT-0005" },
  { name: "ExamSeason_Share", entity: "ENT-0006" },
  { name: "StudyVault_Admin", entity: "ENT-0007" },
  { name: "TeleBooks_04", entity: "ENT-0008" },
];

export function user(id: string, name: string, title: string, email: string, role: Role): User {
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

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function routeFor(platform: string): NoticeRoute {
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
    // "promoted" is reserved for findings that back a case (generated below).
    const statuses: Finding["status"][] = ["new", "ai_flagged", "needs_validation", "validated", "rejected"];
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

  // ---------------------------------------------------------------------------
  // Case book. Generated from fixed quotas so the records reconcile exactly with
  // the executive KPI pack (EXEC_KPI in lib/metrics.ts): 184 cases created, 42
  // closed, 142 active with the same risk, platform, SLA and priority-title mix,
  // 156 notices dispatched, 138 removals, 143 monitored and 16 reappearances.
  // The signature case above counts toward every quota. tests/platform.test.ts
  // asserts the reconciliation, so the tiles and the records cannot drift apart.
  // ---------------------------------------------------------------------------
  const NOW = new Date("2026-09-04T10:00:00Z");
  const HOUR = 3600 * 1000;
  const caseRng = mulberry32(20260926);
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(caseRng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function repeat<T>(pairs: [T, number][]): T[] {
    return pairs.flatMap(([v, n]) => Array.from({ length: n }, () => v));
  }

  type Sla = CaseRecord["slaState"];
  type Slot = { status: CaseStatus; sla: Sla };
  // 141 active cases besides the signature case.
  const activeSlots: Slot[] = [
    ...repeat<Slot>([
      [{ status: "removed", sla: "within" }, 25],
      [{ status: "monitoring", sla: "within" }, 65],
      [{ status: "reopened", sla: "within" }, 5],
      [{ status: "escalated", sla: "breached" }, 5],
      [{ status: "awaiting_response", sla: "breached" }, 4],
      [{ status: "awaiting_response", sla: "approaching" }, 3],
      [{ status: "submitted", sla: "approaching" }, 6],
      [{ status: "new", sla: "approaching" }, 2],
      [{ status: "new", sla: "within" }, 3],
      [{ status: "investigating", sla: "approaching" }, 2],
      [{ status: "investigating", sla: "within" }, 4],
      [{ status: "rights_validation", sla: "approaching" }, 2],
      [{ status: "rights_validation", sla: "within" }, 3],
      [{ status: "legal_review", sla: "approaching" }, 1],
      [{ status: "legal_review", sla: "within" }, 3],
      [{ status: "legal_approved", sla: "approaching" }, 1],
      [{ status: "legal_approved", sla: "within" }, 2],
      [{ status: "notice_ready", sla: "approaching" }, 1],
      [{ status: "notice_ready", sla: "within" }, 2],
      [{ status: "approved_hold", sla: "within" }, 2],
    ]),
  ].map((s) => ({ ...s }));

  const activeRisks = shuffle(repeat<RiskLevel>([["critical", 13], ["high", 24], ["medium", 71], ["low", 33]]));
  const activePlatforms = shuffle(
    repeat<string>([["Telegram", 47], ["Google Drive", 29], ["Website", 24], ["Marketplace", 18], ["Social Media", 13], ["Cyberlocker", 10]])
  );
  // Every critical case is on a priority title; 77 of the other 128 are too (91 in all with the signature case).
  const priorityFlags = shuffle(repeat<boolean>([[true, 77], [false, 51]]));
  const PRIORITY_ROTATION = ["AST-0001", "AST-0002", "AST-0001", "AST-0004", "AST-0003", "AST-0006", "AST-0001", "AST-0002"];
  const OTHER_ROTATION = ["AST-0005", "AST-0007", "AST-0008"];
  let pRot = 0;
  let oRot = 0;

  type Spec = Slot & { risk: RiskLevel; platform: string; assetId: string; closed: boolean };
  const specs: Spec[] = activeSlots.map((slot, i) => {
    const risk = activeRisks[i];
    const onPriority = risk === "critical" ? true : (priorityFlags.pop() as boolean);
    const assetId = onPriority ? PRIORITY_ROTATION[pRot++ % PRIORITY_ROTATION.length] : OTHER_ROTATION[oRot++ % OTHER_ROTATION.length];
    return { ...slot, risk, platform: activePlatforms[i], assetId, closed: false };
  });
  const closedRisks = shuffle(repeat<RiskLevel>([["critical", 3], ["high", 8], ["medium", 19], ["low", 12]]));
  closedRisks.forEach((risk, i) => {
    specs.push({ status: "closed", sla: "within", risk, platform: PLATFORMS[i % PLATFORMS.length].name, assetId: TITLES[i % TITLES.length].id, closed: true });
  });
  const book = shuffle(specs);

  // Days from notice dispatch to removal, by platform (matches removalByPlatform in lib/metrics.ts).
  const REMOVAL_DAYS: Record<string, number> = {
    Telegram: 1.6, "Google Drive": 1.9, Website: 2.4, "Social Media": 2.6, Marketplace: 3.4, Cyberlocker: 4.1,
  };
  const RIGHTS_ON: CaseStatus[] = ["rights_validation", "legal_review", "legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated", "reopened", "approved_hold"];
  const LEGAL_ON: CaseStatus[] = ["legal_review", "legal_approved", "notice_ready", "submitted", "awaiting_response", "removed", "monitoring", "closed", "escalated", "reopened"];
  const DISPATCHED: CaseStatus[] = ["submitted", "awaiting_response", "escalated", "removed", "monitoring", "closed", "reopened"];
  const REMOVED: CaseStatus[] = ["removed", "monitoring", "closed", "reopened"];
  const MONITORED: CaseStatus[] = ["removed", "monitoring", "closed", "reopened", "escalated"];
  const LAST_ACTION: Partial<Record<CaseStatus, string>> = {
    new: "Case opened from validated finding",
    investigating: "Investigator gathering evidence",
    rights_validation: "Four-gate rights validation in progress",
    legal_review: "Awaiting legal review",
    legal_approved: "Legal approved — notice to be drafted",
    notice_ready: "Notice approved — ready to dispatch",
    submitted: "Notice submitted to platform",
    awaiting_response: "Awaiting platform response",
    escalated: "SLA breached — escalated to Lead and Legal",
    removed: "Content removed — monitoring started",
    monitoring: "Content removed — monitoring active",
    reopened: "Reappearance confirmed — case reopened",
    closed: "Closed — monitoring window completed",
    approved_hold: "Rights on hold — clarification needed",
  };

  book.forEach((spec, idx) => {
    const caseId = `SC-2026-${900 + idx}`;
    const fid = `FND-2026-${1200 + idx}`;
    const plat = PLATFORMS.find((p) => p.name === spec.platform) ?? PLATFORMS[0];
    const asset = TITLES.find((t) => t.id === spec.assetId) ?? TITLES[0];
    const uploader = UPLOADERS[idx % UPLOADERS.length];
    const slaHours = slaHoursFor(spec.risk, slaRules, spec.platform === "Telegram" ? 72 : undefined);
    const removalDays = Math.round((REMOVAL_DAYS[spec.platform] + ((idx % 5) - 2) * 0.1) * 10) / 10;
    const removed = REMOVED.includes(spec.status);
    const dispatched = DISPATCHED.includes(spec.status);

    let createdMs: number;
    if (removed) {
      const daysAgo = spec.closed ? 20 + (idx % 45) : 3 + Math.ceil(removalDays) + (idx % 18);
      createdMs = NOW.getTime() - daysAgo * 24 * HOUR;
    } else if (spec.sla === "breached") {
      createdMs = NOW.getTime() - (slaHours + 6 + (idx % 30)) * HOUR;
    } else if (spec.sla === "approaching") {
      createdMs = NOW.getTime() - slaHours * 0.9 * HOUR;
    } else {
      createdMs = NOW.getTime() - slaHours * (0.2 + (idx % 5) * 0.1) * HOUR;
    }
    const createdAt = new Date(createdMs).toISOString();
    const elapsedH = (NOW.getTime() - createdMs) / HOUR;
    const at = (hoursAfterCreate: number) => new Date(createdMs + hoursAfterCreate * HOUR).toISOString();
    const noticeAtH = removed ? 12 : Math.min(4, elapsedH / 4);
    const submittedAtH = removed ? 24 : Math.min(6, elapsedH / 3);
    const removedAtH = submittedAtH + removalDays * 24;

    const match =
      spec.risk === "critical" ? 95 + (idx % 5) : spec.risk === "high" ? 88 + (idx % 7) : spec.risk === "medium" ? 78 + (idx % 10) : 68 + (idx % 10);
    const url = `https://example-demo.com/${plat.cat}/${spec.assetId.toLowerCase()}/${1200 + idx}`;

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
      priority: spec.risk,
      risk: spec.risk,
      status: "promoted",
      assignedInvestigatorId: idx % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
      hostingCountry: plat.country,
      watermarkDetected: match >= 85,
      ocrSimilarity: Math.max(60, match - 4),
      metadata: { simulated: true, region: plat.country },
      relatedFindingIds: [],
      relatedCaseId: caseId,
      notes: "",
      sourceConnector:
        plat.cat === "messaging" ? "MockTelegramConnector" : plat.cat === "marketplace" ? "MockMarketplaceConnector" : plat.cat === "cloud_storage" ? "MockCloudStorageConnector" : "MockWebConnector",
      jobId: null,
    });

    const invId = `INV-${900 + idx}`;
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
      risk: spec.risk,
      priority: spec.risk,
      ownerId: idx % 2 === 0 ? "USR-INV-02" : "USR-INV-01",
      status: spec.status,
      noticeRoute: LEGAL_ON.includes(spec.status) ? routeFor(plat.name) : null,
      daysOpen: daysOpen(createdAt, NOW),
      slaHours,
      slaDueAt: slaDueAt(createdAt, slaHours),
      slaState: removed ? "within" : slaState(createdAt, slaHours, NOW),
      reappearance: false,
      lastAction: LAST_ACTION[spec.status] ?? `Status ${spec.status}`,
      lastActionAt: removed ? at(removedAtH) : dispatched ? at(submittedAtH) : createdAt,
      createdAt,
      hostingCountry: plat.country,
      parentCaseId: null,
      evidenceIds: addEvidence(caseId, fid, idx % 3 === 0 ? 2 : 1, url),
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
      status: spec.status === "new" || spec.status === "investigating" ? "open" : "confirmed",
      notes: [`Investigation opened for ${asset.title}`],
      createdAt,
      updatedAt: createdAt,
    });

    if (RIGHTS_ON.includes(spec.status)) {
      const hold = spec.status === "approved_hold";
      rights.push({
        id: `RV-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        gates: {
          rightsOwnership: "pass",
          infringementSubstantiated: hold ? "hold" : "pass",
          authorization: "pass",
          actionableTarget: hold ? "hold" : "pass",
        },
        inheritedFromCaseId: null,
        confirmationRequired: false,
        confirmed: !hold && spec.status !== "rights_validation",
        reviewerId: "USR-LEG-01",
        reviewedAt: createdAt,
        notes: hold ? "Hold — further clarification" : "4/4 validated",
        title: asset.title,
        isbn: asset.isbn,
        edition: "2025",
        author: asset.author,
        rightsOwner: "S. Chand & Company Limited",
        territory: "IN",
      });
    }

    if (LEGAL_ON.includes(spec.status)) {
      legal.push({
        id: `LR-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        reviewerId: "USR-LEG-01",
        status: spec.status === "legal_review" ? "pending" : "approved",
        jurisdiction: "India",
        recommendedRoute: routeFor(plat.name),
        routeConfidence: "high",
        routeReason: "Configured route for platform.",
        approvedAt: spec.status === "legal_review" ? null : at(noticeAtH),
        notes: "",
      });
    }

    if (spec.status === "notice_ready" || dispatched) {
      const nid = `NTC-${900 + idx}`;
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
      const sid = `SUB-${900 + idx}`;
      rec.submissionId = sid;
      submissions.push({
        id: sid,
        tenantId: TENANT_ID,
        caseId,
        noticeId: rec.noticeId as string,
        ticketId: `${plat.name.slice(0, 2).toUpperCase()}-IP-${70000 + idx}`,
        destination: `${plat.name} IP reporting workflow`,
        status: removed ? "removed" : spec.status === "submitted" ? "submitted" : "awaiting_response",
        submittedAt: at(submittedAtH),
        submittedBy: "USR-OPS-01",
        simulated: true,
      });
    }

    if (removed) {
      responses.push({
        id: `PR-${900 + idx}`,
        tenantId: TENANT_ID,
        submissionId: rec.submissionId as string,
        caseId,
        outcome: "removed",
        receivedAt: at(removedAtH),
        summary: `SIMULATED RESPONSE — removed after ${removalDays} days`,
        simulated: true,
      });
    }

    if (MONITORED.includes(spec.status)) {
      const mid = `MON-${900 + idx}`;
      rec.monitoringJobId = mid;
      monitoring.push({
        id: mid,
        tenantId: TENANT_ID,
        caseId,
        status: spec.closed ? "completed" : "active",
        windowDays: spec.risk === "critical" || spec.risk === "high" ? 30 : spec.risk === "medium" ? 60 : 90,
        cadence: spec.risk === "critical" || spec.risk === "high" ? "daily" : spec.risk === "medium" ? "weekly" : "monthly",
        startedAt: removed ? at(removedAtH) : at(submittedAtH),
        nextScanAt: iso(0, 9),
        lastScanAt: removed ? at(removedAtH) : null,
      });
    }

    if (spec.status === "escalated") {
      escalations.push({
        id: `ESC-${900 + idx}`,
        tenantId: TENANT_ID,
        caseId,
        reason: "SLA breached — escalation required",
        createdAt: at(slaHours),
        status: "open",
        notifyRoles: ["legal", "lead"],
        recommendedRoute: "escalated_legal",
      });
    }

    cases.push(rec);
  });

  // 16 reappearances, all on content that was actually removed: the 5 reopened
  // cases plus 11 cases still in post-removal monitoring.
  const reappearedCases = [
    ...cases.filter((c) => c.status === "reopened"),
    ...cases.filter((c) => c.status === "monitoring" && c.id !== "SC-2026-0842").slice(0, 11),
  ];
  reappearedCases.forEach((c, i) => {
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
      confirmed: c.status === "reopened" || i % 2 === 0,
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
