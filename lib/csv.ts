/**
 * Minimal CSV parser for the uploadable catalogue datasets (lib/dataset-seed.ts).
 * The files we author never contain quoted fields or embedded commas, so a
 * plain split is enough and keeps this dependency-free.
 */
export const DATASET_CSV_COLUMNS = [
  "id",
  "title",
  "isbn",
  "author",
  "category",
  "segment",
  "priorityTitle",
  "indicativeValueInr",
  "platformBias",
] as const;

export type DatasetCsvRow = Record<(typeof DATASET_CSV_COLUMNS)[number], string>;

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) throw new Error("The file has no data rows.");

  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
    if (cells.length !== header.length) {
      throw new Error(`Row ${i + 2} has ${cells.length} columns, expected ${header.length}.`);
    }
    const row: Record<string, string> = {};
    header.forEach((h, idx) => (row[h] = cells[idx]));
    return row;
  });
}

/** Parses and validates a catalogue dataset CSV, throwing a clear error on any problem. */
export function parseDatasetCsv(text: string): DatasetCsvRow[] {
  const rows = parseCsv(text);
  const missingCols = DATASET_CSV_COLUMNS.filter((c) => !(c in (rows[0] ?? {})));
  if (rows.length === 0 || missingCols.length > 0) {
    throw new Error(`Expected columns: ${DATASET_CSV_COLUMNS.join(", ")}.`);
  }
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    if (!row.id) throw new Error(`Row ${i + 2} is missing an id.`);
    if (!row.title) throw new Error(`Row ${i + 2} is missing a title.`);
    if (!row.isbn) throw new Error(`Row ${i + 2} is missing an isbn.`);
    if (seen.has(row.id)) throw new Error(`Duplicate id "${row.id}" in the dataset.`);
    seen.add(row.id);
  });
  return rows as DatasetCsvRow[];
}
