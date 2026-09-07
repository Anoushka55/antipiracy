import type { FourGates, GateResult, RiskLevel } from "./types";

export function slaHoursFor(
  risk: RiskLevel,
  rules: { risk: RiskLevel; hours: number }[],
  platformOverride?: number
): number {
  if (platformOverride) return platformOverride;
  return rules.find((r) => r.risk === risk)?.hours ?? 120;
}

export function slaState(
  createdAt: string,
  slaHours: number,
  now = new Date()
): "within" | "approaching" | "breached" {
  const due = new Date(createdAt).getTime() + slaHours * 3600 * 1000;
  const remaining = due - now.getTime();
  if (remaining <= 0) return "breached";
  if (remaining <= slaHours * 3600 * 1000 * 0.2) return "approaching";
  return "within";
}

export function daysOpen(createdAt: string, now = new Date()): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86400000)
  );
}

export function slaDueAt(createdAt: string, slaHours: number): string {
  return new Date(new Date(createdAt).getTime() + slaHours * 3600 * 1000).toISOString();
}

export function slaProgressLabel(createdAt: string, slaHours: number, now = new Date()): string {
  const elapsedH = (now.getTime() - new Date(createdAt).getTime()) / 3600000;
  const day = Math.min(Math.ceil(elapsedH / 24), Math.ceil(slaHours / 24));
  const of = Math.ceil(slaHours / 24);
  return `Day ${Math.max(1, day)} of ${of}`;
}

export function gatesPassed(gates: FourGates): number {
  return Object.values(gates).filter((g) => g === "pass").length;
}

export function allGatesPass(gates: FourGates): boolean {
  return gatesPassed(gates) === 4;
}

export function legalEligibility(gates: FourGates): "eligible" | "hold" {
  return allGatesPass(gates) ? "eligible" : "hold";
}

export function emptyGates(result: GateResult = "fail"): FourGates {
  return {
    rightsOwnership: result,
    infringementSubstantiated: result,
    authorization: result,
    actionableTarget: result,
  };
}

export function repeatOffenderScore(input: {
  previousCases: number;
  reappearances: number;
  platforms: number;
  successfulRemovals: number;
  avgTimeToReappearanceDays: number;
}): number {
  const volume = Math.min(40, input.previousCases * 4);
  const recur = Math.min(30, input.reappearances * 6);
  const spread = Math.min(15, input.platforms * 4);
  const speed = input.avgTimeToReappearanceDays <= 5 ? 10 : 4;
  const enforcementGap = Math.max(0, 5 - Math.min(5, input.successfulRemovals));
  return Math.min(100, volume + recur + spread + speed + enforcementGap);
}
