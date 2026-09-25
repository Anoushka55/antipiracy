'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Archive, Check, ChevronRight, FileText, HardDrive, Loader2, MessageSquare, ScanLine, Send, ShoppingCart } from 'lucide-react';
import { SCAN_SOURCES, type ScanDocKind } from '@/lib/scan-sources';

const STAGES = ['Crawl', 'Render', 'OCR & fingerprint', 'Match catalogue', 'Deduplicate', 'Score'];
const STAGE_STATUS = ['Crawling source…', 'Rendering document…', 'Extracting text and fingerprint…', 'Comparing against 8 catalogue titles…'];
/** Ticks spent on each document: one per stage from Crawl to Match catalogue. */
const PER_DOC = 4;
/** Ticks after the last document: three for Deduplicate, three for Score. */
const FINAL_TICKS = 6;

const DOCS = SCAN_SOURCES.flatMap((s, sourceIndex) => s.docs.map((d) => ({ ...d, sourceIndex, source: s })));
const DOC_TICKS = DOCS.length * PER_DOC;
const LINE_WIDTHS = [96, 100, 88, 100, 72, 100, 94, 100, 60, 100, 90, 82];

const KIND: Record<ScanDocKind, { label: string; icon: typeof FileText }> = {
  pdf: { label: 'PDF document', icon: FileText },
  telegram: { label: 'Telegram file', icon: Send },
  drive: { label: 'Drive file', icon: HardDrive },
  listing: { label: 'Marketplace listing', icon: ShoppingCart },
  archive: { label: 'Archive', icon: Archive },
  post: { label: 'Public post', icon: MessageSquare },
};

/**
 * Plays back a discovery scan: each source in SCAN_SOURCES is opened, its
 * documents rendered and checked against the catalogue. Calls onComplete once
 * the playback ends; the page waits for both this and the API call.
 */
export function DiscoveryScanPanel({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion();
  const tickMs = reduce ? 20 : 115;
  const [tick, setTick] = useState(0);
  const finished = tick >= DOC_TICKS + FINAL_TICKS;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (finished) {
      completeRef.current();
      return;
    }
    const t = setTimeout(() => setTick((n) => n + 1), tickMs);
    return () => clearTimeout(t);
  }, [tick, finished, tickMs]);

  const docIndex = Math.min(Math.floor(tick / PER_DOC), DOCS.length);
  const finalising = docIndex >= DOCS.length;
  const sub = tick % PER_DOC;
  const stage = finalising ? Math.min(4 + Math.floor((tick - DOC_TICKS) / 3), 5) : sub;
  const isDone = (i: number) => i < docIndex || (i === docIndex && sub === PER_DOC - 1);
  const doc = DOCS[Math.min(docIndex, DOCS.length - 1)];
  const stamped = finalising || sub === PER_DOC - 1;
  const scanned = DOCS.filter((_, i) => isDone(i)).length;
  const matches = DOCS.filter((d, i) => d.match && isDone(i)).length;
  const Kind = KIND[doc.kind];

  return (
    <div className="rounded-2xl border border-[#0077C8]/20 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#0077C8]/5 px-4 py-3">
        <ScanLine size={16} className="text-[#0077C8]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0077C8]">Discovery scan in progress</span>
        <span className="ml-auto text-xs text-[#6B7280] tabular-nums">
          <b className="text-[#1A1F36]">{scanned}</b> of {DOCS.length} documents · <b className="text-[#1A1F36]">{matches}</b> {matches === 1 ? 'match' : 'matches'} · {SCAN_SOURCES.length} sources
        </span>
      </div>

      <div className="grid md:grid-cols-[300px_1fr]">
        <ul className="divide-y divide-[#F1F3F7] border-b md:border-b-0 md:border-r border-[#E2E8F0] py-1">
          {SCAN_SOURCES.map((s, si) => {
            const idx = DOCS.map((d, i) => (d.sourceIndex === si ? i : -1)).filter((i) => i >= 0);
            const done = idx.every(isDone);
            const active = !done && idx.includes(docIndex);
            const hits = s.docs.filter((d) => d.match).length;
            return (
              <li key={s.id} className={`flex items-center gap-2.5 px-4 py-[7px] text-xs transition-colors ${active ? 'bg-[#0077C8]/5' : ''}`}>
                <span className="w-4 flex-shrink-0 flex justify-center">
                  {done ? <Check size={13} className="text-[#00A36C]" /> : active ? <Loader2 size={13} className="text-[#0077C8] animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className={done || active ? 'text-[#1A1F36] font-medium' : 'text-[#9CA3AF]'}>{s.name}</span>
                  <span className="text-[#9CA3AF]"> · {s.platform}</span>
                </span>
                {done && (
                  hits > 0
                    ? <span className="text-[10px] font-semibold text-[#DC2626] flex-shrink-0">{hits} {hits === 1 ? 'match' : 'matches'}</span>
                    : <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">Clean</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <Kind.icon size={14} className="text-[#00338D] flex-shrink-0" />
            <span className="font-semibold text-[#1A1F36] flex-shrink-0">{Kind.label}</span>
            <span className="font-mono text-[11px] text-[#6B7280] truncate">{doc.url}</span>
          </div>

          <div className="flex flex-1 items-center justify-center rounded-xl bg-[#F4F6F9] py-5">
            <div className="relative h-[268px] w-[210px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white px-5 py-5 shadow-sm">
              <div className="text-[11px] font-bold leading-snug text-[#1A1F36] line-clamp-2">{doc.title}</div>
              <div className="mt-1 text-[9px] text-[#9CA3AF]">{doc.source.name}</div>
              <div className="mt-4 space-y-2">
                {LINE_WIDTHS.map((w, i) => (
                  <div key={i} className="h-[5px] rounded-full bg-[#E2E8F0]" style={{ width: `${w}%` }} />
                ))}
              </div>

              {!stamped && (
                <motion.div
                  key={docIndex}
                  className="absolute inset-x-0 h-12 border-b-2 border-[#0077C8] bg-gradient-to-b from-transparent to-[#0077C8]/15"
                  initial={{ top: '-18%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: ((PER_DOC - 1) * tickMs) / 1000, ease: 'linear' }}
                />
              )}

              <AnimatePresence>
                {stamped && (
                  <motion.div
                    key={`stamp-${docIndex}`}
                    initial={{ opacity: 0, scale: 1.35 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 flex items-center justify-center bg-white/60"
                  >
                    {doc.match ? (
                      <div className="-rotate-6 rounded-lg border-2 border-[#DC2626] bg-white px-3 py-2 text-center">
                        <div className="text-sm font-extrabold tracking-wide text-[#DC2626]">MATCH {doc.match.score}%</div>
                        <div className="text-[10px] font-semibold text-[#1A1F36]">{doc.match.catalogueTitle}</div>
                        <div className="text-[9px] text-[#6B7280]">{doc.match.watermark ? 'Watermark detected' : 'No watermark'}</div>
                      </div>
                    ) : (
                      <div className="-rotate-6 rounded-lg border-2 border-[#9CA3AF] bg-white px-3 py-2 text-center">
                        <div className="text-xs font-bold tracking-wide text-[#6B7280]">NO CATALOGUE MATCH</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Loader2 size={12} className="animate-spin text-[#0077C8]" />
            {finalising
              ? stage === 4 ? 'Removing duplicates already in the inbox…' : `Scoring ${matches} matches for priority and risk…`
              : STAGE_STATUS[sub]}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#E2E8F0] px-4 py-3">
        {STAGES.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                i === stage ? 'bg-[#0077C8] text-white' : i < stage ?'bg-[#00338D]/10 text-[#00338D]' : 'bg-[#F4F6F9] text-[#9CA3AF]'
              }`}
            >
              {label}
            </span>
            {i < STAGES.length - 1 && <ChevronRight size={12} className="text-[#CBD5E1]" />}
          </div>
        ))}
      </div>
    </div>
  );
}
