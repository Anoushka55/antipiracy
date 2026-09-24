import type { CaseStatus, GateResult, Role } from "./types";

/**
 * K.Bot's knowledge base.
 *
 * This is the single source of truth K.Bot draws on to explain the platform.
 * It is hand-curated and cross-checked against `lib/constants.ts` (NAV_GROUPS,
 * CASE_STATUS_LABEL, etc.) so navigation facts never drift from the real
 * sidebar. When a new page, workflow stage, or feature is added to the app,
 * add an entry here so K.Bot stays accurate — this file is K.Bot's "memory"
 * of the platform.
 */

export interface PageGuide {
  id: string;
  href: string;
  title: string;
  keywords: string[];
  whatItIs: string;
  howToUseIt: string[];
  relatedPages: string[];
  roles: Role[] | "all";
}

// Keep `id` aligned with the `id` used in lib/constants.ts NAV_GROUPS.
export const PAGE_GUIDES: PageGuide[] = [
  {
    id: "overview",
    href: "/overview",
    title: "Overview",
    keywords: ["overview", "dashboard", "home", "executive", "summary", "kpi", "kri"],
    whatItIs:
      "The executive dashboard — a single-screen snapshot of active cases, takedown rate, platform mix, risk distribution, trends, and top alerts.",
    howToUseIt: [
      "Start here each day to see what needs attention across the whole program.",
      "Check the KPI/KRI cards at the top for headline numbers (active cases, takedown rate, SLA breaches).",
      "Use the alerts panel to jump straight into the cases or findings that need action.",
    ],
    relatedPages: ["analytics", "reports"],
    roles: "all",
  },
  {
    id: "analytics",
    href: "/analytics",
    title: "Analytics",
    keywords: ["analytics", "charts", "trends", "insights", "search"],
    whatItIs:
      "A deeper analytics view for slicing platform, risk, and trend data, plus a global search across cases, findings, assets, evidence, and entities.",
    howToUseIt: [
      "Use this when Overview doesn't have enough detail on a specific trend.",
      "Use the search to quickly locate a case, ISBN, or entity by keyword.",
    ],
    relatedPages: ["overview", "reports"],
    roles: "all",
  },
  {
    id: "reports",
    href: "/reports",
    title: "Reports",
    keywords: ["reports", "report builder", "export", "pdf", "weekly report"],
    whatItIs:
      "The report builder — generates one of 11 report types: Executive, Weekly, Investigator Productivity, Platform Effectiveness, Priority Title Exposure, Reappearance, Legal Action, Financial Exposure, AI Governance, Audit, and LLM Exposure.",
    howToUseIt: [
      "Pick a report type from the list to see its narrative and charts.",
      "Use Weekly or Executive reports for a quick leadership recap.",
      "Use Audit or AI Governance reports if you need a compliance-style trail.",
    ],
    relatedPages: ["overview", "analytics"],
    roles: "all",
  },
  {
    id: "discovery",
    href: "/discovery",
    title: "Discovery",
    keywords: ["discovery", "findings", "new findings", "scan", "detect", "triage"],
    whatItIs:
      "The discovery queue — new potential piracy findings surfaced from (simulated) Telegram, web, marketplace, and cloud-storage sources, each with an AI-suggested priority.",
    howToUseIt: [
      "Review new findings and check the AI-suggested priority and confidence — this is a recommendation, not a decision.",
      "Validate a finding to confirm it's worth investigating, or reject it as a false positive.",
      "Once validated, promote a finding to open a formal case.",
    ],
    relatedPages: ["investigations", "cases"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "investigations",
    href: "/investigations",
    title: "Investigations",
    keywords: ["investigations", "investigate", "notes"],
    whatItIs:
      "The list of open investigations tied to findings — where an investigator adds notes and confirms whether infringement is substantiated before a case moves forward.",
    howToUseIt: [
      "Open an investigation to add notes as you gather context.",
      "Confirm infringement once you have enough evidence to substantiate the finding.",
    ],
    relatedPages: ["discovery", "cases", "evidence"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "cases",
    href: "/cases",
    title: "Cases",
    keywords: ["case", "cases", "case detail", "workflow", "status", "gates", "rights", "legal review", "notice"],
    whatItIs:
      "The case list and case detail workflow — the heart of the platform. Every case moves through a controlled lifecycle: rights validation (four gates), legal review, notice generation, submission, and monitoring.",
    howToUseIt: [
      "Open a case to see its current status, the four rights-validation gates, legal review status, notices, and evidence.",
      "Ask me 'what should I do next' while viewing a specific case and I'll read its actual status and tell you the next step.",
      "Only Legal reviewers can approve rights and legal review; only Operations/Admin can submit notices.",
    ],
    relatedPages: ["investigations", "evidence", "enforcement", "radar"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "evidence",
    href: "/evidence",
    title: "Evidence Vault",
    keywords: ["evidence", "vault", "hash", "chain of custody", "screenshot"],
    whatItIs:
      "The evidence vault — stores captured screenshots, metadata, and file hashes for each case, with a verifiable chain of custody (SHA-256 hash per item).",
    howToUseIt: [
      "Open an evidence item to see its capture details and chain-of-custody events.",
      "Use 'verify' to confirm an evidence hash still matches — this is what legal review checks before approving a notice.",
    ],
    relatedPages: ["cases", "investigations"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "enforcement",
    href: "/enforcement",
    title: "Enforcement",
    keywords: ["enforcement", "notice", "submit", "dispatch", "takedown"],
    whatItIs:
      "The enforcement queue — where approved takedown notices are submitted (simulated) to platforms, and platform responses are recorded.",
    howToUseIt: [
      "A case must have an approved notice before it appears here as ready to submit.",
      "After submission, record the platform's response (removed / rejected / more info / no response) to move the case forward.",
    ],
    relatedPages: ["cases", "radar"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "radar",
    href: "/radar",
    title: "Reappearance Radar",
    keywords: ["radar", "reappearance", "resurface", "reopen", "mirror"],
    whatItIs:
      "Monitors removed content for reappearance — mirrors, re-uploads, or the same uploader striking again — and links new findings back to the original case.",
    howToUseIt: [
      "Cases with active monitoring show up here after their content is removed.",
      "Confirm a detected reappearance to automatically link it to the original case and bump the entity's repeat-offender score.",
      "Confirming a reappearance does not automatically send a new notice — you still reopen the case and go through legal review again.",
    ],
    relatedPages: ["cases", "entities"],
    roles: ["lead", "investigator", "legal", "operations", "admin"],
  },
  {
    id: "catalogue",
    href: "/catalogue",
    title: "Catalogue",
    keywords: ["catalogue", "titles", "books", "isbn", "assets", "priority title"],
    whatItIs:
      "The protected title catalogue — S. Chand's books and their rights ownership, priority flag, and known piracy patterns.",
    howToUseIt: [
      "Open a title to see every finding and case linked to it.",
      "Priority titles get elevated AI priority scoring during discovery.",
    ],
    relatedPages: ["discovery", "entities"],
    roles: ["lead", "investigator", "legal", "admin", "executive"],
  },
  {
    id: "entities",
    href: "/entities",
    title: "Repeat Offenders",
    keywords: ["entities", "repeat offenders", "uploader", "channel", "network", "relationship graph"],
    whatItIs:
      "Tracks uploaders, channels, and marketplace sellers across cases, with a risk score and a relationship graph showing linked accounts/domains.",
    howToUseIt: [
      "Open an entity to see its full case history, reappearance rate, and connections to other entities.",
      "Use this before escalating — a high repeat-offender score is grounds for faster legal escalation.",
    ],
    relatedPages: ["radar", "catalogue"],
    roles: ["lead", "investigator", "admin", "executive"],
  },
  {
    id: "llm",
    href: "/llm-probing",
    title: "LLM Exposure",
    keywords: ["llm", "llm exposure", "gemini", "chatgpt", "claude", "meta", "ai probe", "red team"],
    whatItIs:
      "A separate module analyzing whether S. Chand book content is exposed through public LLMs (content-awareness and forensic-similarity probes across models).",
    howToUseIt: [
      "Review per-model findings to see which titles show up with high similarity in LLM outputs.",
      "Use the LLM Exposure report (in Reports) for a leadership-ready summary of this module.",
    ],
    relatedPages: ["reports"],
    roles: ["lead", "investigator", "admin", "executive"],
  },
  {
    id: "configuration",
    href: "/configuration",
    title: "Configuration",
    keywords: ["configuration", "config", "sla rules", "platforms", "notice templates", "ai config", "retention"],
    whatItIs:
      "Tenant-level configuration — SLA rules by risk level, supported platforms, notice templates, AI model settings, and data retention policy.",
    howToUseIt: [
      "Change SLA hours per risk tier here rather than anywhere else — it drives every case's due date.",
      "Notice templates here are used whenever a case generates a notice.",
    ],
    relatedPages: ["administration"],
    roles: ["admin", "lead"],
  },
  {
    id: "administration",
    href: "/administration",
    title: "Administration",
    keywords: ["administration", "admin", "users", "connectors", "jobs", "health"],
    whatItIs:
      "The admin console — manage users and roles, check discovery connector health, and monitor background jobs.",
    howToUseIt: [
      "Check connector health here if discovery seems to have stalled.",
      "Manage user roles here — this determines what each person can see and do across the platform.",
    ],
    relatedPages: ["configuration", "audit"],
    roles: ["admin", "lead"],
  },
  {
    id: "audit",
    href: "/audit",
    title: "Audit Log",
    keywords: ["audit", "audit log", "history", "who did what"],
    whatItIs:
      "A full audit trail of every mutation across the platform — logins, case status changes, approvals, and configuration edits — each tied to a user and timestamp.",
    howToUseIt: [
      "Use this to answer 'who approved this' or 'when did this case change status.'",
      "Every workflow action anywhere in the app writes an entry here automatically.",
    ],
    relatedPages: ["administration"],
    roles: ["admin", "lead"],
  },
];

/**
 * Case workflow stages, in lifecycle order, keyed by CaseStatus.
 * Kept consistent with the ALLOWED transition table in lib/workflow.ts —
 * update both together if the state machine changes.
 */
export interface WorkflowStageGuide {
  status: CaseStatus;
  label: string;
  whatHappensHere: string;
  whoActs: Role[];
  nextAction: string;
  /**
   * Position on the canonical happy-path spine (0-indexed), or null if this
   * status is a branch/detour rather than a spine stage. Used by the
   * JourneyStepper component to render a horizontal step tracker.
   */
  spineIndex: number | null;
  /**
   * For detour statuses (spineIndex === null), which spine status this
   * branched off from — the stepper anchors the detour badge there.
   */
  detourFrom?: CaseStatus;
}

export const WORKFLOW_STAGES: WorkflowStageGuide[] = [
  {
    status: "new",
    label: "New",
    whatHappensHere: "The case has just been created from a promoted finding and hasn't been picked up yet.",
    whoActs: ["investigator", "lead"],
    nextAction: "Assign the case (or pick it up) and begin the investigation.",
    spineIndex: 0,
  },
  {
    status: "investigating",
    label: "Investigating",
    whatHappensHere: "An investigator is gathering evidence and confirming the infringement is real.",
    whoActs: ["investigator", "lead"],
    nextAction: "Confirm infringement once you have enough evidence — this moves the case into rights validation.",
    spineIndex: 1,
  },
  {
    status: "rights_validation",
    label: "Rights Validation",
    whatHappensHere: "The case is being checked against the four gates: rights ownership, infringement substantiated, authorization, and actionable target.",
    whoActs: ["legal"],
    nextAction: "A Legal reviewer approves rights once all four gates pass (or are put on hold with a reason).",
    spineIndex: 2,
  },
  {
    status: "legal_review",
    label: "Legal Review",
    whatHappensHere: "Legal is reviewing the case for jurisdiction, notice route, and overall legal soundness.",
    whoActs: ["legal"],
    nextAction: "Legal approves, holds, or rejects the case.",
    spineIndex: 3,
  },
  {
    status: "legal_approved",
    label: "Legal Approved",
    whatHappensHere: "Legal has approved the case — a takedown notice can now be generated.",
    whoActs: ["legal"],
    nextAction: "Generate the notice using the recommended notice route.",
    spineIndex: 4,
  },
  {
    status: "notice_ready",
    label: "Notice Ready",
    whatHappensHere: "A notice has been drafted and approved, and is ready for submission to the platform.",
    whoActs: ["legal", "operations"],
    nextAction: "Submit the notice from the Enforcement page.",
    spineIndex: 5,
  },
  {
    status: "submitted",
    label: "Submitted",
    whatHappensHere: "The notice has been (simulated) submitted to the hosting platform or registrar.",
    whoActs: ["operations"],
    nextAction: "Wait for or record the platform's response.",
    spineIndex: 6,
  },
  {
    status: "awaiting_response",
    label: "Awaiting Response",
    whatHappensHere: "Waiting on the platform to act on the submitted notice.",
    whoActs: ["operations"],
    nextAction: "Record the platform's response when it comes in (removed, rejected, more info, or no response).",
    spineIndex: 7,
  },
  {
    status: "removed",
    label: "Removed",
    whatHappensHere: "The infringing content was taken down. The case is NOT closed yet — a monitoring job starts automatically to watch for reappearance.",
    whoActs: ["operations", "lead"],
    nextAction: "Let monitoring run; close the case once the monitoring window passes without reappearance.",
    spineIndex: 8,
  },
  {
    status: "monitoring",
    label: "Monitoring",
    whatHappensHere: "A monitoring job is actively watching for reappearance of the removed content.",
    whoActs: ["investigator", "lead"],
    nextAction: "If a reappearance is detected on the Radar page, confirm it to link it back to this case.",
    spineIndex: 9,
  },
  {
    status: "closed",
    label: "Closed",
    whatHappensHere: "The case is fully resolved with no further action needed.",
    whoActs: ["lead"],
    nextAction: "No action needed — this is the end state.",
    spineIndex: 10,
  },
  {
    status: "escalated",
    label: "Escalated",
    whatHappensHere: "The case has been flagged for priority attention — usually due to an SLA breach, reappearance, or critical priority.",
    whoActs: ["lead", "legal"],
    nextAction: "A lead or legal reviewer should acknowledge and resolve the escalation.",
    spineIndex: null,
    detourFrom: "awaiting_response",
  },
  {
    status: "reopened",
    label: "Reopened",
    whatHappensHere: "A confirmed reappearance caused this case to be reopened for a fresh enforcement cycle.",
    whoActs: ["investigator", "lead"],
    nextAction: "Treat it like a case in Investigating — re-confirm and move it back through rights validation.",
    spineIndex: null,
    detourFrom: "monitoring",
  },
  {
    status: "approved_hold",
    label: "Approved Hold",
    whatHappensHere: "Rights were validated but one or more gates are on hold pending more information.",
    whoActs: ["legal"],
    nextAction: "Resolve the hold (get the missing information) then re-approve rights.",
    spineIndex: null,
    detourFrom: "rights_validation",
  },
  {
    status: "rejected",
    label: "Rejected",
    whatHappensHere: "Legal or rights validation rejected the case — it will not proceed to enforcement.",
    whoActs: ["legal"],
    nextAction: "No further enforcement action; the case is closed out as rejected.",
    spineIndex: null,
    detourFrom: "legal_review",
  },
];

export const SPINE_STAGES = WORKFLOW_STAGES.filter((s) => s.spineIndex !== null).sort(
  (a, b) => (a.spineIndex as number) - (b.spineIndex as number)
);

export const GATE_LABELS: Record<string, string> = {
  rightsOwnership: "Rights Ownership",
  infringementSubstantiated: "Infringement Substantiated",
  authorization: "Authorization",
  actionableTarget: "Actionable Target",
};

export const GATE_EXPLANATIONS: Record<string, string> = {
  rightsOwnership: "Confirms S. Chand (or the named rights owner) actually owns the rights to this title.",
  infringementSubstantiated: "Confirms the finding is a genuine unauthorized copy, not a false positive.",
  authorization: "Confirms no license or permission exists that would make this use legitimate.",
  actionableTarget: "Confirms there's a real, reachable target (platform, host, or seller) that a notice can be sent to.",
};

export function gateResultMeaning(result: GateResult): string {
  if (result === "pass") return "passed";
  if (result === "hold") return "on hold — needs more information before it can pass";
  return "failed";
}

export interface FaqEntry {
  keywords: string[];
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    keywords: ["what is this", "what is this platform", "what does this do", "purpose"],
    question: "What is this platform?",
    answer:
      "This is the S. Chand Anti-Piracy Command Center — a closed-loop platform for finding, investigating, validating, and enforcing against pirated copies of S. Chand's books, then monitoring for reappearance.",
  },
  {
    keywords: ["real data", "synthetic", "demo data", "is this real", "data real", "fake data", "prototype"],
    question: "Is the data real?",
    answer:
      "No — this is a prototype using synthetic, deterministic demo data. There's no live scraping, no real DMCA filings, and no live external AI calls. It's built to demonstrate the workflow end-to-end.",
  },
  {
    keywords: ["ai", "how does the ai work", "is the ai real", "artificial intelligence", "recommendation"],
    question: "How does the 'AI' in this platform work?",
    answer:
      "All AI features here are deterministic and rule-based, not live machine-learning calls — and every AI output is clearly labeled and always requires human validation before anything is approved, sent, or closed. AI assists; humans decide.",
  },
  {
    keywords: ["role", "roles", "permission", "who can", "access"],
    question: "What can my role do?",
    answer:
      "There are 6 roles: Executive (view-only dashboards/reports), Anti-Piracy Lead (oversees everything), Investigator (works findings/cases/evidence), Legal Reviewer (approves rights and legal review, generates/approves notices), Platform Operations (submits notices, records responses), and Administrator (configuration, users, audit). Ask me about a specific page and I'll tell you if your role can access it.",
  },
  {
    keywords: ["four gates", "4 gates", "gate", "gates"],
    question: "What are the four gates?",
    answer:
      "Every case must pass four gates before legal action: Rights Ownership, Infringement Substantiated, Authorization, and Actionable Target. All four need to pass (or be resolved from hold) before legal review can approve the case.",
  },
  {
    keywords: ["reappearance", "resurface", "comes back", "reopen"],
    question: "What happens if removed content reappears?",
    answer:
      "Removing content doesn't close the case — a monitoring job watches for reappearance. If a mirror or re-upload is detected on the Reappearance Radar page and confirmed, it links back to the original case, bumps the uploader's repeat-offender score, and the case is reopened for another enforcement cycle. It does not auto-send a new notice — a human still drives that.",
  },
  {
    keywords: ["password", "login", "demo user", "persona"],
    question: "How do I log in?",
    answer:
      "Use one of the 6 demo personas on the login screen (executive, lead, investigator, legal, operations) — they all share the demo password Schand@2026.",
  },
];
