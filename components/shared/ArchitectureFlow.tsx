'use client';

import { ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FlowColorGroup = 'interface' | 'intelligence' | 'data';

const GROUP_COLOR: Record<FlowColorGroup, string> = {
  interface: '#0077C8',
  intelligence: '#8B1E3F',
  data: '#00A36C',
};

const GROUP_LABEL: Record<FlowColorGroup, string> = {
  interface: 'Interface & runtime',
  intelligence: 'Intelligence',
  data: 'Data & records',
};

export interface FlowCardSpec {
  icon: LucideIcon;
  title: string;
  description: string;
  tags?: string[];
}

export interface FlowBand {
  label: string;
  colorGroup: FlowColorGroup;
  cards: FlowCardSpec[];
}

/**
 * Left-border accent card — the KPICard pattern documented in
 * docs/design.md but not previously implemented as a shared component.
 *
 * Resting layout is untouched (compact, single-line title with ellipsis) so
 * the flow diagram's grid never reflows. On hover, a second absolutely
 * positioned copy of the card fades/scales in above everything, anchored to
 * the same top-left corner at its own natural (un-clipped) height — a "pop
 * out in place" rather than an in-flow expansion that would push sibling
 * cards around.
 */
export function FlowCard({ icon: Icon, title, description, tags, color }: FlowCardSpec & { color: string }) {
  const content = (expanded: boolean) => (
    <>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '18' }}>
          <Icon size={14} style={{ color }} />
        </div>
        <div className={`text-sm font-semibold text-[#1A1F36] ${expanded ? '' : 'truncate'}`}>{title}</div>
      </div>
      <p className="text-xs text-[#6B7280] leading-snug">{description}</p>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F6F9] text-[#6B7280] border border-[#E2E8F0]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="group relative flex-1 min-w-[220px] hover:z-20">
      {/* Resting card — always in flow, defines the grid's real size */}
      <div
        className="bg-white rounded-xl border border-[#E2E8F0] border-l-[3px] p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]"
        style={{ borderLeftColor: color }}
      >
        {content(false)}
      </div>

      {/* Hover pop-out — absolutely positioned over the same top-left corner, own natural height, out of flow */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-[260px] bg-white rounded-xl border border-[#E2E8F0] border-l-[3px] p-4 shadow-xl opacity-0 scale-95 origin-top-left transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100"
        style={{ borderLeftColor: color }}
      >
        {content(true)}
      </div>
    </div>
  );
}

/** Vertical layered flow — a stack of bands joined by a centered down-arrow, generalizing ClosedLoopDiagram's horizontal chip-and-arrow pattern to a full-page system diagram. */
export function ArchitectureFlow({ bands, legend = true }: { bands: FlowBand[]; legend?: boolean }) {
  return (
    <div>
      {legend && (
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-[#E2E8F0]">
          {(Object.keys(GROUP_LABEL) as FlowColorGroup[]).map((g) => (
            <div key={g} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLOR[g] }} />
              {GROUP_LABEL[g]}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {bands.map((band, i) => (
          <div key={band.label}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] text-center mb-3">{band.label}</div>
            <div className="flex flex-wrap gap-3 justify-center">
              {band.cards.map((card) => (
                <FlowCard key={card.title} {...card} color={GROUP_COLOR[band.colorGroup]} />
              ))}
            </div>
            {i < bands.length - 1 && (
              <div className="flex justify-center py-3">
                <ArrowDown size={16} className="text-[#9CA3AF]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
