import type { Role } from "./types";

export type Permission =
  | "dashboard.view"
  | "dashboard.executive"
  | "finding.view"
  | "finding.investigate"
  | "finding.promote"
  | "case.view"
  | "case.edit"
  | "case.assign"
  | "evidence.view"
  | "evidence.upload"
  | "rights.approve"
  | "legal.approve"
  | "notice.generate"
  | "notice.approve"
  | "notice.submit"
  | "config.edit"
  | "admin.users"
  | "reports.view"
  | "reports.export"
  | "demo.controls"
  | "audit.view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  executive: [
    "dashboard.view",
    "dashboard.executive",
    "case.view",
    "reports.view",
    "reports.export",
  ],
  lead: [
    "dashboard.view",
    "finding.view",
    "finding.investigate",
    "finding.promote",
    "case.view",
    "case.edit",
    "case.assign",
    "evidence.view",
    "reports.view",
    "reports.export",
    "audit.view",
    "demo.controls",
  ],
  investigator: [
    "dashboard.view",
    "finding.view",
    "finding.investigate",
    "finding.promote",
    "case.view",
    "case.edit",
    "evidence.view",
    "evidence.upload",
    "reports.view",
  ],
  legal: [
    "dashboard.view",
    "finding.view",
    "case.view",
    "evidence.view",
    "rights.approve",
    "legal.approve",
    "notice.generate",
    "notice.approve",
    "reports.view",
  ],
  operations: [
    "dashboard.view",
    "finding.view",
    "case.view",
    "evidence.view",
    "notice.submit",
    "reports.view",
  ],
  admin: [
    "dashboard.view",
    "finding.view",
    "case.view",
    "evidence.view",
    "config.edit",
    "admin.users",
    "reports.view",
    "reports.export",
    "demo.controls",
    "audit.view",
  ],
};

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: role ${role} cannot ${permission}`);
  }
}

export function navAllowed(role: Role, roles: Role[] | "all"): boolean {
  if (roles === "all") return true;
  return roles.includes(role);
}
