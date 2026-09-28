'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Archive, Check, ChevronRight, Fingerprint, Globe, HardDrive, Loader2, MessageSquare, Radar, Send, ShoppingCart } from 'lucide-react';
import { MONITOR_CHECKPOINTS } from '@/lib/reappearance-sources';
import type { Reappearance } from '@/lib/types';

const STAGES = ['Crawl', 'Fingerprint', 'Compare', 'Watermark check', 'Link case', 'Score'];
const STAGE_STATUS = ['Crawling monitored source…', 'Extracting content fingerprint…', 'Comparing against removed originals…', 'Checking watermark and ISBN…'];
/** Ticks spent per checkpoint before the last one, and ticks the final (hit) checkpoint holds while waiting on the real API result. */
const PER_CHECKPOINT = 4;
const FINAL_TICKS = 6;

const LINE_WIDTHS = [92, 100, 84, 100, 68, 100, 90];

const PLATFORM_ICON: Record<string, typeof Globe> = {
  Telegram: Send,
  'Google Drive': HardDrive,
  Marketplace: ShoppingCart,
  'Social Media': MessageSquare,
  Cyberlocker: Archive,
  'Independent File Host': Archive,
};

/**
 * Plays back a reappearance sweep: each monitored checkpoint is crawled and
 * fingerprinted against previously-removed originals. The last checkpoint is
 * held until the real `radar/simulate` call resolves, then shows the actual
 * reappearance it found (or "no match" if the case had none). Calls
 * onComplete once the playback and the result are both ready.
 */
export function ReappearanceScanPanel({
  caseId,
  result,
  onComplete,
}: {
  caseId: string;
  /** The real API result, once it has resolved — null while still in flight. */
  result: Reappearance | null;
  onComplete: () => void;
}) {
  const reduce = useReducedMotion();
  const tickMs = reduce ? 20 : 130;
  const [tick, setTick] = useState(0);
  const lastIndex = MONITOR_CHECKPOINTS.length - 1;
  const preFinalTicks = lastIndex * PER_CHECKPOINT;
  const finished = tick >= preFinalTicks + FINAL_TICKS && result !== null;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (finished) {
      completeRef.current();
      return;
    }
    // Hold at the last tick once the playback is done but the API hasn't
    // resolved yet, instead of racing ahead of the real result.
    const cappedTick = Math.min(tick, preFinalTicks + FINAL_TICKS - 1);
    const t = setTimeout(() => setTick((n) => Math.min(n + 1, cappedTick + 1)), tickMs);
    return () => clearTimeout(t);
  }, [tick, finished, tickMs, preFinalTicks]);

  const checkpointIndex = Math.min(Math.floor(tick / PER_CHECKPOINT), MONITOR_CHECKPOINTS.length - 1);
  const onFinal = checkpointIndex === lastIndex;
  const sub = onFinal ? Math.min(tick - preFinalTicks, PER_CHECKPOINT - 1) : tick % PER_CHECKPOINT;
  const stage = Math.min(sub, STAGES.length - 1);
  const isDone = (i: number) => i < checkpointIndex;
  const checkpoint = MONITOR_CHECKPOINTS[checkpointIndex];
  const waitingOnResult = onFinal && tick >= preFinalTicks + PER_CHECKPOINT - 1;
  const stamped = waitingOnResult && result !== null;
  const Icon = PLATFORM_ICON[checkpoint.platform] ?? Globe;
  const scanned = MONITOR_CHECKPOINTS.filter((_, i) => isDone(i)).length + (stamped ? 1 : 0);

  return (
    <div className="rounded-2xl border border-[#8B1E3F]/20 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#8B1E3F]/5 px-4 py-3">
        <Radar size={16} className="text-[#8B1E3F]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B1E3F]">Reappearance sweep in progress</span>
        <span className="ml-auto text-xs text-[#6B7280] tabular-nums">
          <b className="text-[#1A1F36]">{scanned}</b> of {MONITOR_CHECKPOINTS.length} sources checked for <span className="font-mono">{caseId}</span>
        </span>
      </div>

      <div className="grid md:grid-cols-[300px_1fr]">
        <ul className="divide-y divide-[#F1F3F7] border-b md:border-b-0 md:border-r border-[#E2E8F0] py-1">
          {MONITOR_CHECKPOINTS.map((c, i) => {
            const done = isDone(i) || (i === lastIndex && stamped);
            const active = !done && i === checkpointIndex;
            const isHit = i === lastIndex && stamped && result;
            return (
              <li key={c.id} className={`flex items-center gap-2.5 px-4 py-[7px] text-xs transition-colors ${active ? 'bg-[#8B1E3F]/5' : ''}`}>
                <span className="w-4 flex-shrink-0 flex justify-center">
                  {done ? <Check size={13} className="text-[#00A36C]" /> : active ? <Loader2 size={13} className="text-[#8B1E3F] animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className={done || active ? 'text-[#1A1F36] font-medium' : 'text-[#9CA3AF]'}>{c.name}</span>
                  <span className="text-[#9CA3AF]"> · {c.platform}</span>
                </span>
                {done && (
                  isHit
                    ? <span className="text-[10px] font-semibold text-[#DC2626] flex-shrink-0">Match found</span>
                    : i === lastIndex && stamped
                      ? <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">No match</span>
                      : <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">Clean</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <Icon size={14} className="text-[#8B1E3F] flex-shrink-0" />
            <span className="font-semibold text-[#1A1F36] flex-shrink-0">{checkpoint.platform}</span>
            <span className="font-mono text-[11px] text-[#6B7280] truncate">{result && onFinal ? result.newUrl : checkpoint.url}</span>
          </div>

          <div className="flex flex-1 items-center justify-center rounded-xl bg-[#F4F6F9] py-5">
            <div className="relative h-[268px] w-[210px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white px-5 py-5 shadow-sm">
              <div className="text-[11px] font-bold leading-snug text-[#1A1F36] line-clamp-2">{checkpoint.name}</div>
              <div className="mt-1 text-[9px] text-[#9CA3AF]">{checkpoint.platform}</div>
              <div className="mt-4 space-y-2">
                {LINE_WIDTHS.map((w, i) => (
                  <div key={i} className="h-[5px] rounded-full bg-[#E2E8F0]" style={{ width: `${w}%` }} />
                ))}
              </div>

              {!stamped && (
                <motion.div
                  key={checkpointIndex}
                  className="absolute inset-x-0 h-12 border-b-2 border-[#8B1E3F] bg-gradient-to-b from-transparent to-[#8B1E3F]/15"
                  initial={{ top: '-18%' }}
                  animate={{ top: waitingOnResult ? '40%' : '100%' }}
                  transition={waitingOnResult ? { duration: 0.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } : { duration: ((PER_CHECKPOINT - 1) * tickMs) / 1000, ease: 'linear' }}
                />
              )}

              <AnimatePresence>
                {stamped && (
                  <motion.div
                    key={`stamp-${checkpointIndex}`}
                    initial={{ opacity: 0, scale: 1.35 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 flex items-center justify-center bg-white/60"
                  >
                    {result ? (
                      <div className="-rotate-6 rounded-lg border-2 border-[#DC2626] bg-white px-3 py-2 text-center">
                        <div className="text-sm font-extrabold tracking-wide text-[#DC2626]">{result.similarity}% MATCH</div>
                        <div className="text-[10px] font-semibold text-[#1A1F36]">Reappearance of {result.originalCaseId}</div>
                        <div className="text-[9px] text-[#6B7280]">{result.watermarkMatch ? 'Watermark matches original' : 'No watermark match'}</div>
                      </div>
                    ) : (
                      <div className="-rotate-6 rounded-lg border-2 border-[#9CA3AF] bg-white px-3 py-2 text-center">
                        <div className="text-xs font-bold tracking-wide text-[#6B7280]">NO REAPPEARANCE FOUND</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Fingerprint size={12} className="flex-shrink-0 text-[#8B1E3F]" />
            {waitingOnResult ? 'Confirming against the case system…' : STAGE_STATUS[sub] ?? STAGE_STATUS[STAGE_STATUS.length - 1]}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#E2E8F0] px-4 py-3">
        {STAGES.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                i === stage ? 'bg-[#8B1E3F] text-white' : i < stage ? 'bg-[#8B1E3F]/10 text-[#8B1E3F]' : 'bg-[#F4F6F9] text-[#9CA3AF]'
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
