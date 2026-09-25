import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { parseDatasetCsv } from "@/lib/csv";
import { buildDatasetSeed } from "@/lib/dataset-seed";
import type { AppState } from "@/lib/types";

const Q3_PATH = path.join(process.cwd(), "data", "datasets", "schand-q3-catalogue.csv");
const Q4_PATH = path.join(process.cwd(), "data", "datasets", "schand-q4-catalogue.csv");

function allIds(state: AppState): string[] {
  return [
    ...state.catalogue.map((r) => r.id),
    ...state.findings.map((r) => r.id),
    ...state.cases.map((r) => r.id),
    ...state.evidence.map((r) => r.id),
    ...state.investigations.map((r) => r.id),
    ...state.rightsValidations.map((r) => r.id),
    ...state.legalReviews.map((r) => r.id),
    ...state.notices.map((r) => r.id),
    ...state.submissions.map((r) => r.id),
    ...state.platformResponses.map((r) => r.id),
    ...state.escalations.map((r) => r.id),
    ...state.monitoringJobs.map((r) => r.id),
    ...state.reappearances.map((r) => r.id),
  ];
}

function expectFullyPopulated(state: AppState) {
  expect(state.catalogue.length).toBeGreaterThan(0);
  expect(state.findings.length).toBeGreaterThan(0);
  expect(state.cases.length).toBeGreaterThan(0);
  expect(state.evidence.length).toBeGreaterThan(0);
  expect(state.investigations.length).toBeGreaterThan(0);
  expect(state.rightsValidations.length).toBeGreaterThan(0);
  expect(state.legalReviews.length).toBeGreaterThan(0);
  expect(state.notices.length).toBeGreaterThan(0);
  expect(state.submissions.length).toBeGreaterThan(0);
  expect(state.platformResponses.length).toBeGreaterThan(0);
  expect(state.escalations.length).toBeGreaterThan(0);
  expect(state.monitoringJobs.length).toBeGreaterThan(0);
  expect(state.reappearances.length).toBeGreaterThan(0);
  expect(state.entities.length).toBeGreaterThan(0);
  expect(state.financialEstimates.length).toBeGreaterThan(0);
  expect(state.notifications.length).toBeGreaterThan(0);
  expect(state.users.length).toBeGreaterThan(0);
  // Every case status bucket the demo's pages read from should be represented.
  const statuses = new Set(state.cases.map((c) => c.status));
  for (const s of ["new", "investigating", "submitted", "awaiting_response", "removed", "monitoring", "escalated", "closed"]) {
    expect(statuses.has(s as never), `missing case status ${s}`).toBe(true);
  }
  // No case, evidence link, notice, etc. points at an id that doesn't exist.
  const caseIds = new Set(state.cases.map((c) => c.id));
  for (const f of state.findings) {
    if (f.relatedCaseId) expect(caseIds.has(f.relatedCaseId), f.id).toBe(true);
  }
  for (const c of state.cases) {
    if (c.noticeId) expect(state.notices.some((n) => n.id === c.noticeId), c.id).toBe(true);
    if (c.submissionId) expect(state.submissions.some((s) => s.id === c.submissionId), c.id).toBe(true);
    if (c.monitoringJobId) expect(state.monitoringJobs.some((m) => m.id === c.monitoringJobId), c.id).toBe(true);
    expect(c.evidenceIds.length).toBeGreaterThan(0);
  }
}

describe("uploadable dataset generator", () => {
  it("parses both sample CSVs", () => {
    const q3 = parseDatasetCsv(fs.readFileSync(Q3_PATH, "utf8"));
    const q4 = parseDatasetCsv(fs.readFileSync(Q4_PATH, "utf8"));
    expect(q3.length).toBeGreaterThanOrEqual(8);
    expect(q4.length).toBeGreaterThanOrEqual(8);
    // The two catalogues must not share a single title id, so an upload never
    // looks like it merely appended to what was already there.
    const overlap = q3.filter((r) => q4.some((r2) => r2.id === r.id));
    expect(overlap).toHaveLength(0);
  });

  it("builds a fully populated state from the Q3 sample", () => {
    const rows = parseDatasetCsv(fs.readFileSync(Q3_PATH, "utf8"));
    const state = buildDatasetSeed(rows, "S. Chand Q3 Catalogue Refresh", 1);
    expectFullyPopulated(state);
    expect(state.catalogue.map((c) => c.title)).toEqual(rows.map((r) => r.title));
  });

  it("builds a fully populated state from the Q4 sample", () => {
    const rows = parseDatasetCsv(fs.readFileSync(Q4_PATH, "utf8"));
    const state = buildDatasetSeed(rows, "S. Chand Q4 Catalogue Refresh", 2);
    expectFullyPopulated(state);
  });

  it("never reuses an id between two consecutive uploads", () => {
    const q3 = parseDatasetCsv(fs.readFileSync(Q3_PATH, "utf8"));
    const q4 = parseDatasetCsv(fs.readFileSync(Q4_PATH, "utf8"));
    const first = buildDatasetSeed(q3, "S. Chand Q3 Catalogue Refresh", 11);
    const second = buildDatasetSeed(q4, "S. Chand Q4 Catalogue Refresh", 12);
    const firstIds = new Set(allIds(first));
    const collisions = allIds(second).filter((id) => firstIds.has(id));
    expect(collisions).toHaveLength(0);
  });

  it("produces no duplicate ids within a single generated state", () => {
    const rows = parseDatasetCsv(fs.readFileSync(Q3_PATH, "utf8"));
    const state = buildDatasetSeed(rows, "S. Chand Q3 Catalogue Refresh", 21);
    const ids = allIds(state);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects a CSV with the wrong columns", () => {
    expect(() => parseDatasetCsv("a,b,c\n1,2,3")).toThrow();
  });

  it("rejects a CSV with a duplicate id", () => {
    const header = "id,title,isbn,author,category,segment,priorityTitle,indicativeValueInr,platformBias";
    const row = "AST-X,Title,123,Author,Cat,Seg,false,400,Website";
    expect(() => parseDatasetCsv([header, row, row].join("\n"))).toThrow();
  });
});
