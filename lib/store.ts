import fs from "fs";
import path from "path";
import type { AppState } from "./types";
import { buildSeed } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "runtime-store.json");

let memory: AppState | null = null;

function persistEnabled() {
  return process.env.PERSIST_STORE !== "false";
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function getStore(): AppState {
  if (memory) {
    heal(memory);
    return memory;
  }
  if (persistEnabled() && fs.existsSync(STORE_FILE)) {
    try {
      memory = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as AppState;
      heal(memory);
      return memory;
    } catch {
      memory = buildSeed();
      persist();
      return memory;
    }
  }
  memory = buildSeed();
  persist();
  return memory;
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function heal(state: AppState) {
  state.findings = uniqueById(state.findings);
  state.evidence = uniqueById(state.evidence);
}

export function persist() {
  if (!memory || !persistEnabled()) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(memory));
  } catch {
    // Prototype store is best-effort on disk.
  }
}

export function mutate<T>(fn: (state: AppState) => T): T {
  const state = getStore();
  const result = fn(state);
  persist();
  return result;
}

export function snapshot(): AppState {
  return clone(getStore());
}

export function resetStore(): AppState {
  memory = buildSeed();
  persist();
  return memory;
}

export function replaceStore(state: AppState): AppState {
  memory = state;
  persist();
  return memory;
}

export function tenantScope<T extends { tenantId: string }>(rows: T[], tenantId: string): T[] {
  return rows.filter((r) => r.tenantId === tenantId);
}
