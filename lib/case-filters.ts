import { CASE_STATUS_LABEL } from "./constants";
import type { AppState, CaseRecord } from "./types";

/**
 * Case list filters, shared by the /api/cases handler, the Cases page (which
 * reads them from its URL) and the KPI drill-downs (which link to them). Keeping
 * one implementation means a drill-down's "View all N" count always matches the
 * list it opens.
 */
export interface CaseFilter {
  status?: string[];
  risk?: string[];
  sla?: string[];
  platform?: string[];
  /** Exclude closed cases. */
  active?: boolean;
  /** Only cases on catalogue titles flagged as priority. */
  priorityTitle?: boolean;
  /** Only cases whose removed content has resurfaced. */
  reappearance?: boolean;
  q?: string;
}

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);

export function parseCaseFilter(sp: URLSearchParams): CaseFilter {
  return {
    status: list(sp.get("status")),
    risk: list(sp.get("risk")),
    sla: list(sp.get("sla")),
    platform: list(sp.get("platform")),
    active: sp.get("active") === "1" || undefined,
    priorityTitle: sp.get("priorityTitle") === "1" || undefined,
    reappearance: sp.get("reappearance") === "1" || undefined,
    q: sp.get("q") || undefined,
  };
}

export function caseFilterQuery(f: CaseFilter): string {
  const sp = new URLSearchParams();
  if (f.active) sp.set("active", "1");
  if (f.status?.length) sp.set("status", f.status.join(","));
  if (f.risk?.length) sp.set("risk", f.risk.join(","));
  if (f.sla?.length) sp.set("sla", f.sla.join(","));
  if (f.platform?.length) sp.set("platform", f.platform.join(","));
  if (f.priorityTitle) sp.set("priorityTitle", "1");
  if (f.reappearance) sp.set("reappearance", "1");
  if (f.q) sp.set("q", f.q);
  return sp.toString();
}

export function caseFilterHref(f: CaseFilter): string {
  const qs = caseFilterQuery(f);
  return qs ? `/cases?${qs}` : "/cases";
}

export function hasCaseFilter(f: CaseFilter): boolean {
  return caseFilterQuery({ ...f, q: undefined }).length > 0;
}

export function filterCases(state: AppState, f: CaseFilter, tenantId = state.tenant.id): CaseRecord[] {
  const priorityAssets = f.priorityTitle ? new Set(state.catalogue.filter((a) => a.priorityTitle).map((a) => a.id)) : null;
  const q = f.q?.toLowerCase();
  return state.cases.filter((c) => {
    if (c.tenantId !== tenantId) return false;
    if (f.active && c.status === "closed") return false;
    if (f.status?.length && !f.status.includes(c.status)) return false;
    if (f.risk?.length && !f.risk.includes(c.risk)) return false;
    if (f.sla?.length && !f.sla.includes(c.slaState)) return false;
    if (f.platform?.length && !f.platform.includes(c.platform)) return false;
    if (priorityAssets && !priorityAssets.has(c.assetId)) return false;
    if (f.reappearance && !c.reappearance) return false;
    if (q && !`${c.id} ${c.title} ${c.platform} ${c.uploader}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const RISK_LABEL: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const SLA_LABEL: Record<string, string> = { breached: "Past SLA", approaching: "About to breach", within: "Within SLA" };

/** A short human label for the active filters, e.g. "Active · Critical & High · Past SLA". */
export function describeCaseFilter(f: CaseFilter): string {
  const parts: string[] = [];
  if (f.active) parts.push("Active");
  if (f.risk?.length) parts.push(f.risk.map((r) => RISK_LABEL[r] ?? r).join(" & "));
  if (f.sla?.length) parts.push(f.sla.map((s) => SLA_LABEL[s] ?? s).join(" or "));
  if (f.status?.length) parts.push(f.status.map((s) => CASE_STATUS_LABEL[s] ?? s).join(", "));
  if (f.platform?.length) parts.push(f.platform.join(", "));
  if (f.priorityTitle) parts.push("Flagship titles");
  if (f.reappearance) parts.push("Resurfaced");
  return parts.join(" · ");
}
