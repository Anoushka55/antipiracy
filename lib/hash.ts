import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashPassword(password: string): string {
  return sha256(`schand-demo::${password}`);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function evidenceHash(payload: {
  id: string;
  sourceUrl: string;
  capturedAt: string;
  type: string;
}): string {
  return sha256(
    `${payload.id}|${payload.sourceUrl}|${payload.capturedAt}|${payload.type}|SCHAND-EVIDENCE`
  );
}
