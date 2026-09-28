import type { NoticeRoute, PlatformCategory, Role } from "./types";

export const TENANT_ID = "SCHAND" as const;

export const DEMO_PASSWORD = "Schand@2026";

export const SESSION_COOKIE = "schand_cc_session";

export const SCHAND_LOGO = "/schand-logo.png";
export const KPMG_LOGO = "/kpmg-logo.svg";

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
  /** Each item inherits the group's `roles` unless it sets its own, narrowing visibility further. */
  items: { id: string; label: string; href: string; roles?: Role[] | "all" }[];
}[] = [
  {
    label: "Command",
    roles: ["executive", "investigator", "legal", "operations"],
    items: [
      { id: "overview", label: "Overview", href: "/overview" },
      { id: "analytics", label: "Analytics", href: "/analytics" },
      { id: "reports", label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Operations",
    roles: ["lead", "investigator", "legal", "operations"],
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
    label: "Legal",
    roles: ["lead", "legal"],
    items: [
      { id: "legal", label: "Legal Review", href: "/legal" },
      { id: "notices", label: "Notices", href: "/notices" },
    ],
  },
  {
    label: "Catalogue",
    roles: ["investigator", "legal", "admin"],
    items: [{ id: "catalogue", label: "Catalogue", href: "/catalogue" }],
  },
  {
    label: "Intelligence",
    roles: ["investigator", "executive"],
    items: [
      { id: "entities", label: "Repeat Offenders", href: "/entities", roles: ["investigator"] },
      { id: "llm", label: "LLM Exposure", href: "/llm-probing" },
    ],
  },
  {
    label: "System",
    roles: ["admin"],
    items: [
      { id: "configuration", label: "Configuration", href: "/configuration" },
      { id: "administration", label: "Administration", href: "/administration" },
      { id: "audit", label: "Audit Log", href: "/audit" },
    ],
  },
];

/**
 * The rights holder's authorised representative and contact block used on
 * every notice, taken from S. Chand's own draft notices.
 */
export const RIGHTS_HOLDER_CONTACT = {
  company: "S. Chand & Company Limited",
  shortName: "S. Chand",
  representative: "Mr. Murli",
  title: "Anti-Piracy Lead",
  address: "Building No. D-92, Sector 2, Noida - 201301, Uttar Pradesh, India",
  telephone: "1800-103-1926",
  email: "info@schandpublishing.com",
  jurisdiction: "India",
} as const;

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
  admin: "Technology Lead",
};

/**
 * Where a demo persona lands after signing in, keyed by email prefix.
 * The single source of truth for this mapping — used by the login page
 * (to redirect to /welcome first) and the welcome screen (to redirect
 * onward once the user continues past it).
 */
export function destinationForEmail(email: string): string {
  if (email.startsWith("sourabh")) return "/overview";
  if (email.startsWith("murli")) return "/discovery";
  if (email.startsWith("inv")) return "/discovery";
  if (email.startsWith("legal")) return "/cases";
  if (email.startsWith("ops")) return "/enforcement";
  if (email.startsWith("b.pradhan")) return "/administration";
  return "/overview";
}
