'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { SPINE_STAGES, WORKFLOW_STAGES } from '@/lib/kbot-knowledge';
import { Badge } from '@/components/shared/Badge';
import { ROLE_LABEL } from '@/lib/constants';
import type { CaseStatus, Role } from '@/lib/types';

interface TransitionRow {
  from: string | null;
  to: string;
  timestamp: string;
  reason: string;
  actorId?: string;
}

interface EscalationInfo {
  id: string;
  reason: string;
  status: string;
  notifyRoles: Role[];
  createdAt: string;
}

interface UserRef {
  id: string;
  name: string;
}

function formatTimestamp(ts: string): string {
  return ts.slice(0, 16).replace('T', ' ');
}

function findTransition(transitions: TransitionRow[], status: string): TransitionRow | undefined {
  return transitions.find((row) => row.to === status);
}

function actorName(users: UserRef[] | undefined, actorId: string | undefined): string | null {
  if (!actorId) return null;
  return users?.find((u) => u.id === actorId)?.name ?? actorId;
}

/**
 * Horizontal step-by-step tracker for a case's journey along the canonical
 * happy-path spine (see lib/kbot-knowledge.ts WORKFLOW_STAGES/SPINE_STAGES).
 * Detour statuses (approved_hold, rejected, reopened) render as a badge
 * anchored to the spine stage they branched from. Escalation gets its own
 * distinct branch marker below the spine, since it's the most consequential
 * detour a case can take (SLA breach, reappearance, or critical priority).
 */
export function JourneyStepper({
  transitions,
  currentStatus,
  escalation,
  users,
}: {
  transitions: TransitionRow[];
  currentStatus: CaseStatus;
  escalation?: EscalationInfo;
  users?: UserRef[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const currentStage = WORKFLOW_STAGES.find((s) => s.status === currentStatus);
  const isDetour = currentStage?.spineIndex === null;
  const anchorStatus = isDetour ? currentStage?.detourFrom ?? null : currentStatus;
  const currentSpineIndex = SPINE_STAGES.findIndex((s) => s.status === anchorStatus);
  const detourColor: 'red' | 'amber' = currentStatus === 'rejected' ? 'red' : 'amber';
  const detourEntry = isDetour ? findTransition(transitions, currentStatus) : undefined;

  const currentlyEscalated = currentStatus === 'escalated';
  const everEscalated = currentlyEscalated || transitions.some((row) => row.to === 'escalated') || Boolean(escalation);
  const escalationAnchorIndex = everEscalated
    ? SPINE_STAGES.findIndex((s) => s.status === 'awaiting_response')
    : -1;

  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateFades();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [transitions, currentStatus]);

  function scrollByAmount(dir: 1 | -1) {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Case journey</div>
        {(showLeftFade || showRightFade) && (
          <div className="flex gap-1">
            <button
              onClick={() => scrollByAmount(-1)}
              disabled={!showLeftFade}
              className="w-6 h-6 rounded-md border border-[#E2E8F0] flex items-center justify-center text-[#6B7280] disabled:opacity-30 hover:bg-[#F4F6F9] transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => scrollByAmount(1)}
              disabled={!showRightFade}
              className="w-6 h-6 rounded-md border border-[#E2E8F0] flex items-center justify-center text-[#6B7280] disabled:opacity-30 hover:bg-[#F4F6F9] transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        {showLeftFade && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-white to-transparent" />
        )}
        {showRightFade && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-white to-transparent" />
        )}

        <div ref={scrollRef} className="flex items-start overflow-x-auto pb-1">
          {SPINE_STAGES.map((stage, i) => {
            const done = i < currentSpineIndex;
            const current = i === currentSpineIndex && !isDetour;
            const anchor = i === currentSpineIndex && isDetour;
            const t = findTransition(transitions, stage.status);
            const connectorSolid = i > 0 && i <= currentSpineIndex;
            const isOpen = openNode === stage.status;
            const isEscalationAnchor = i === escalationAnchorIndex && everEscalated;

            const dotColor = done ? '#00A36C' : current || anchor ? '#00338D' : '#E2E8F0';

            return (
              <div key={stage.status} className="flex items-start flex-1 min-w-[110px] last:flex-none">
                {i > 0 && (
                  <div
                    className={`h-0 flex-1 border-t-2 ${connectorSolid ? 'border-solid' : 'border-dashed'}`}
                    style={{ borderColor: connectorSolid ? '#00A36C' : '#E2E8F0', marginTop: 13 }}
                  />
                )}
                <div className="relative flex flex-col items-center text-center px-1" style={{ minWidth: 92 }}>
                  <button
                    type="button"
                    onClick={() => t && setOpenNode(isOpen ? null : stage.status)}
                    className="flex flex-col items-center focus:outline-none"
                    onMouseEnter={() => t && setOpenNode(stage.status)}
                    onMouseLeave={() => setOpenNode((v) => (v === stage.status ? null : v))}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 relative"
                      style={{
                        backgroundColor: done ? '#00A36C' : current || anchor ? '#00338D' : '#FFFFFF',
                        border: `2px solid ${dotColor}`,
                      }}
                    >
                      {done && <Check size={13} className="text-white" />}
                      {(current || anchor) && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white" />
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00338D]">
                            <span className="absolute inset-0 rounded-full bg-[#00338D] animate-ping opacity-60" />
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      className="text-[10px] font-semibold mt-2 leading-tight"
                      style={{ color: done ? '#00A36C' : current || anchor ? '#00338D' : '#9CA3AF' }}
                    >
                      {stage.label}
                    </div>
                    {t && (done || current) && (
                      <div className="text-[9px] text-[#9CA3AF] font-mono mt-0.5">{formatTimestamp(t.timestamp)}</div>
                    )}
                    {anchor && (
                      <div className="mt-1.5">
                        <Badge color={detourColor} size="xs">{currentStage?.label}</Badge>
                      </div>
                    )}
                  </button>

                  {isEscalationAnchor && (
                    <div className="flex flex-col items-center mt-2">
                      <div
                        className={`w-0.5 h-3 ${currentlyEscalated ? 'bg-[#DC2626]' : 'bg-[#DC2626]/40'}`}
                      />
                      <div className="relative">
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest ${
                            currentlyEscalated
                              ? 'bg-[#FEF2F2] border-[#DC2626]/40 text-[#DC2626]'
                              : 'bg-[#F4F6F9] border-[#DC2626]/20 text-[#DC2626]/70'
                          }`}
                        >
                          <TriangleAlert size={10} />
                          Escalated
                          {currentlyEscalated && (
                            <span className="relative w-1.5 h-1.5 rounded-full bg-[#DC2626] ml-0.5">
                              <span className="absolute inset-0 rounded-full bg-[#DC2626] animate-ping opacity-60" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isOpen && t && (
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 z-20 w-56 bg-white rounded-xl border border-[#E2E8F0] shadow-lg p-3 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{stage.label}</div>
                      <div className="text-[11px] text-[#1A1F36] font-mono mb-1">{formatTimestamp(t.timestamp)}</div>
                      {actorName(users, t.actorId) && (
                        <div className="text-[11px] text-[#6B7280] mb-1">By {actorName(users, t.actorId)}</div>
                      )}
                      <div className="text-[11px] text-[#6B7280]">{t.reason}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDetour && detourEntry?.reason && (
        <div
          className={`mt-4 text-xs rounded-xl px-3 py-2 ${
            detourColor === 'red' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FFFBEB] text-[#D4A017]'
          }`}
        >
          <span className="font-bold uppercase tracking-widest text-[10px] mr-1.5">{currentStage?.label}:</span>
          {detourEntry.reason}
        </div>
      )}

      {everEscalated && escalation && (
        <div
          className={`mt-3 text-xs rounded-xl px-3 py-2 ${
            currentlyEscalated ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F4F6F9] text-[#6B7280]'
          }`}
        >
          <span className="font-bold uppercase tracking-widest text-[10px] mr-1.5">
            Escalation {currentlyEscalated ? '(active)' : '(resolved)'}:
          </span>
          {escalation.reason}
          {escalation.notifyRoles?.length > 0 && (
            <span className="ml-1.5 text-[#9CA3AF]">
              · Notified {escalation.notifyRoles.map((r) => ROLE_LABEL[r]).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
