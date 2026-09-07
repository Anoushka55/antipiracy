import type { NoticeRoute, PlatformCategory, Role } from "./types";

export const TENANT_ID = "SCHAND" as const;

export const DEMO_PASSWORD = "Schand@2026";

export const SESSION_COOKIE = "schand_cc_session";

export const SCHAND_LOGO = "/schand-logo.png";
export const KPMG_LOGO = "/kpmg-logo.svg";

/** S. Chand brand palette for main application UI */
export const SCHAND_RED = "#c83328";
export const SCHAND_RED_DARK = "#a82a22";
export const SCHAND_RED_LIGHT = "#fdf2f1";
export const SCHAND_BLACK = "#111111";
export const SCHAND_WHITE = "#ffffff";

export const MODEL_MATCH = "AntiPiracy-Match-v0.1-demo";
export const MODEL_MATCH_VERSION = "0.1.0";
export const MODEL_FORECAST = "FORECAST-v0.1";
export const PROMPT_VERSION = "SCHAND-PROMPT-v0.3";
export const FINANCIAL_METHODOLOGY = "Financial Exposure v0.1";
export const FINANCIAL_VERSION = "FIN-v0.1";
export const RISK_METHODOLOGY = "Risk Scoring v0.1";
export const TOOL_VERSION = "EvidenceCapture-v0.4-demo";

export const NAV_GROUPS: {
  label: string;
  roles: Role[] | "all";
  items: { id: string; label: string; href: string }[];
}[] = [
  {
    label: "Command",
    roles: "all",
    items: [
      { id: "overview", label: "Overview", href: "/overview" },
      { id: "analytics", label: "Analytics", href: "/analytics" },
      { id: "reports", label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Operations",
    roles: ["lead", "investigator", "legal", "operations", "admin"],
    items: [
      { id: "discovery", label: "Discovery", href: "/discovery" },
      { id: "investigations", label: "Investigations", href: "/investigations" },
      { id: "cases", label: "Cases", href: "/cases" },
      { id: "evidence", label: "Evidence Vault", href: "/evidence" },
      { id: "enforcement", label: "Enforcement", href: "/enforcement" },
      { id: "radar", label: "Reappearance Radar", href: "/radar" },
    ],
  },
  {
    label: "Catalogue",
    roles: ["lead", "investigator", "legal", "admin", "executive"],
    items: [{ id: "catalogue", label: "Catalogue", href: "/catalogue" }],
  },
  {
    label: "Intelligence",
    roles: ["lead", "investigator", "admin", "executive"],
    items: [
      { id: "entities", label: "Repeat Offenders", href: "/entities" },
      { id: "llm", label: "LLM Exposure", href: "/llm-probing" },
    ],
  },
  {
    label: "System",
    roles: ["admin", "lead"],
    items: [
      { id: "configuration", label: "Configuration", href: "/configuration" },
      { id: "administration", label: "Administration", href: "/administration" },
      { id: "audit", label: "Audit Log", href: "/audit" },
    ],
  },
];

export const NOTICE_ROUTE_LABEL: Record<NoticeRoute, string> = {
  platform_ip_form: "Platform IP Form",
  us_dmca: "US DMCA",
  india_intermediary: "India Intermediary Notice",
  registrar_hosting: "Registrar / Hosting Escalation",
  escalated_legal: "Escalated Legal Review",
};

export const PLATFORM_LABEL: Record<PlatformCategory, string> = {
  messaging: "Telegram",
  cloud_storage: "Google Drive",
  web: "Websites",
  marketplace: "Marketplaces",
  social: "Social Media",
  cyberlocker: "Cyberlockers",
};

export const CASE_STATUS_LABEL: Record<string, string> = {
  new: "New",
  investigating: "Investigating",
  rights_validation: "Rights Validation",
  legal_review: "Legal Review",
  legal_approved: "Legal Approved",
  notice_ready: "Notice Ready",
  submitted: "Submitted",
  awaiting_response: "Awaiting Response",
  removed: "Removed",
  escalated: "Escalated",
  monitoring: "Monitoring",
  reopened: "Reopened",
  closed: "Closed",
  approved_hold: "Approved Hold",
  rejected: "Rejected",
};

export const ROLE_LABEL: Record<Role, string> = {
  executive: "Executive",
  lead: "Anti-Piracy Lead",
  investigator: "Investigator",
  legal: "Legal Reviewer",
  operations: "Platform Operations",
  admin: "Administrator",
};
