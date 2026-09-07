let seq = 1000;

export function resetSeq(n = 1000) {
  seq = n;
}

export function nextSeq() {
  seq += 1;
  return seq;
}

export function id(prefix: string, n?: number) {
  const v = n ?? nextSeq();
  return `${prefix}-${String(v).padStart(4, "0")}`;
}

export function uuidLike(prefix: string) {
  return `${prefix}-${nextSeq()}-${Math.abs((seq * 7919) % 99999)}`;
}
