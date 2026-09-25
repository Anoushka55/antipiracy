'use client';

import { useState } from 'react';
import {
  BarChart3,
  Bot,
  Briefcase,
  Database,
  FileText,
  Gavel,
  Globe,
  Layers,
  Link2,
  Lock,
  RotateCcw,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DetailModal } from '@/components/shared/Overlay';
import { ARCH_DETAILS, ARCH_GOVERNANCE, ARCH_LAYERS, type ArchBox, type ArchIcon, type ArchLayer } from '@/lib/platform-architecture';

const ICONS: Record<ArchIcon, LucideIcon> = {
  bot: Bot, users: Users, search: Search, upload: Upload, sliders: SlidersHorizontal, database: Database,
  target: Target, layers: Layers, link: Link2, file: FileText, trend: TrendingUp, briefcase: Briefcase,
  shield: Shield, gavel: Gavel, send: Send, radar: RotateCcw, chart: BarChart3, globe: Globe,
};

// The reappearance loop runs in the left gutter from the Data Layer (03) down to Legal & Enforcement (06).
const LOOP_FROM = 2;
const LOOP_TO = 5;

type LoopSegment = 'start' | 'mid' | 'end' | null;

function AiTag() {
  return <span className="text-[9px] font-extrabold tracking-wider px-1 py-px rounded-sm bg-[#0077C8] text-white">AI</span>;
}

function Item({ raw }: { raw: string }) {
  const [text, flag] = raw.split('|');
  if (flag === 'gate') {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-sm border border-[#E9C766] bg-[#FFF7E0] text-[#6B4E00]">
        <Lock size={11} className="text-[#C9950C]" />
        {text}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-sm border border-[#E3E8F0] bg-[#F5F7FA] text-[#14213D]">
      {text}
      {flag === 'ai' && <AiTag />}
    </span>
  );
}

function Box({ box, inAiLayer, onOpen }: { box: ArchBox; inAiLayer?: boolean; onOpen: (key: string) => void }) {
  const Icon = ICONS[box.icon];
  return (
    <button
      type="button"
      onClick={() => onOpen(box.key)}
      className="text-left bg-white border border-[#CBD5E1] rounded overflow-hidden flex flex-col transition-all duration-150 hover:border-[#9FB2CF] hover:shadow-[0_6px_18px_rgba(0,51,141,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9950C]"
    >
      <span className={`flex items-center gap-2 px-3 py-2 text-white text-[12.5px] font-bold ${inAiLayer ? 'bg-[#0077C8]' : 'bg-[#00338D]'}`}>
        <Icon size={14} className="flex-shrink-0" />
        <span className="flex-1">{box.title}</span>
        {box.ai && <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-sm bg-white/20">AI</span>}
      </span>
      <span className="flex flex-col gap-2 px-3 pt-2.5 pb-3 flex-1">
        {box.fn && <span className="font-mono text-[10.5px] text-[#0077C8]">{box.fn}</span>}
        {box.items && (
          <span className="flex flex-wrap gap-1.5">
            {box.items.map((raw) => <Item key={raw} raw={raw} />)}
          </span>
        )}
        <span className="mt-auto pt-1.5 border-t border-dashed border-[#E3E8F0] text-[11px] text-[#5B6478] leading-snug">{box.why}</span>
      </span>
    </button>
  );
}

function LoopGutter({ segment }: { segment: LoopSegment }) {
  if (!segment) return <div className="hidden lg:block" />;
  const line = 'absolute left-[10px] border-[#C9950C] border-dashed';
  return (
    <div className="hidden lg:block relative">
      {segment === 'start' && (
        <>
          <span className={`${line} top-1/2 bottom-0 right-0 border-l-2 border-t-2 rounded-tl-lg`} />
          <span className="absolute top-1/2 -right-[3px] -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[9px] border-l-[#C9950C]" />
        </>
      )}
      {segment === 'mid' && <span className={`${line} inset-y-0 border-l-2`} />}
      {segment === 'end' && <span className={`${line} top-0 bottom-1/2 right-0 border-l-2 border-b-2 rounded-bl-lg`} />}
    </div>
  );
}

function Connector({ layer, loop, onOpen }: { layer: ArchLayer; loop: LoopSegment; onOpen: (key: string) => void }) {
  const gate = layer.gate;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[150px_24px_minmax(0,1fr)] lg:gap-x-3.5">
      <div className="hidden lg:block" />
      <LoopGutter segment={loop} />
      <div className="relative h-10 flex items-center justify-center">
        <span className={`absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 ${gate ? 'bg-[#C9950C]' : 'bg-[#9FB2CF]'}`} />
        <span className={`absolute left-1/2 -bottom-px -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[8px] ${gate ? 'border-t-[#C9950C]' : 'border-t-[#9FB2CF]'}`} />
        {gate ? (
          <button
            type="button"
            onClick={() => onOpen(gate.key)}
            className="relative z-[1] inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#C9950C] bg-[#FFF7E0] px-3 py-1 text-[11px] font-bold text-[#6B4E00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9950C]"
          >
            <Lock size={11} className="text-[#C9950C]" />
            {gate.label} · {gate.stat}
          </button>
        ) : (
          layer.out && <span className="relative z-[1] bg-white px-2.5 py-0.5 text-[11px] italic font-semibold text-[#5B6478]">{layer.out}</span>
        )}
      </div>
    </div>
  );
}

function loopSegment(index: number, isConnector: boolean): LoopSegment {
  if (index === LOOP_FROM && !isConnector) return 'start';
  if (index === LOOP_TO && !isConnector) return 'end';
  if ((index > LOOP_FROM && index < LOOP_TO) || (isConnector && index >= LOOP_FROM && index < LOOP_TO)) return 'mid';
  return null;
}

/**
 * The platform drawn top to bottom as seven layers: role-based access,
 * multi-source intake, the data layer, the AI intelligence layer, two human
 * approval gates, case and evidence, legal and enforcement, and reporting.
 * A governance rail runs alongside every layer, and a dashed loop returns
 * resurfaced content from the Reappearance Radar to the Data Layer.
 */
export function PlatformArchitecture() {
  const [open, setOpen] = useState<string | null>(null);
  const detail = open ? ARCH_DETAILS[open] : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-5 border-b-[3px] border-[#00338D]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#0077C8]">S. Chand &amp; Company · Anti-Piracy Command Center</div>
          <h2 className="text-xl font-extrabold text-[#0B1F4D] mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Platform AI Architecture</h2>
          <p className="text-xs text-[#5B6478] mt-1 max-w-2xl leading-relaxed">
            How a suspected pirated copy moves through the platform, top to bottom: role-based access and multi-source intake, the AI
            intelligence layer, human approval gates, enforcement and executive reporting. Click any box for its detail.
          </p>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[11px] text-[#5B6478]">
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded-sm bg-[#00338D]" />Platform module</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded-sm bg-[#0077C8]" />AI intelligence</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded-sm bg-[#C9950C]" />Human approval</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          {ARCH_LAYERS.map((layer, i) => (
            <div key={layer.n}>
              <div className="grid grid-cols-1 lg:grid-cols-[150px_24px_minmax(0,1fr)] lg:gap-x-3.5 gap-y-2">
                <div className="flex lg:flex-col lg:justify-center items-baseline lg:items-start flex-wrap gap-x-2 gap-y-0.5 py-1">
                  <span className="text-[22px] font-extrabold leading-none text-[#CBD5E1] tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{layer.n}</span>
                  <span className={`text-[13px] font-extrabold uppercase tracking-wide ${layer.ai ? 'text-[#0077C8]' : 'text-[#0B1F4D]'}`}>{layer.name}</span>
                  <span className="text-[11.5px] text-[#5B6478] leading-snug">{layer.purpose}</span>
                  <span className="mt-1 text-[10.5px] font-bold text-[#00338D] bg-[#EEF3FA] border border-[#D5E1F2] rounded-full px-2 py-0.5">{layer.kpi}</span>
                </div>
                <LoopGutter segment={loopSegment(i, false)} />
                {layer.ai ? (
                  <div className="bg-[#EAF3FB] border border-[#BFDAF2] rounded-md p-2.5 flex flex-col gap-2.5">
                    <div className="flex flex-wrap justify-between items-center gap-2 text-[11.5px] font-semibold text-[#0B4F85]">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-extrabold"><Sparkles size={13} />AI intelligence layer</span>
                      <span>Every output records model, version, prompt and confidence, and waits for a person</span>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: layer.cols }}>
                      {layer.boxes.map((box) => <Box key={box.key} box={box} inAiLayer onOpen={setOpen} />)}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-1 lg:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: layer.cols }}>
                    {layer.boxes.map((box) => <Box key={box.key} box={box} onOpen={setOpen} />)}
                  </div>
                )}
              </div>
              {i < ARCH_LAYERS.length - 1 && <Connector layer={layer} loop={loopSegment(i, true)} onOpen={setOpen} />}
            </div>
          ))}
          <div className="hidden lg:flex items-center gap-2 mt-4 pl-[188px] text-[11px] font-bold text-[#C9950C]">
            <RotateCcw size={13} />
            Dashed loop: resurfaced content returns from the Reappearance Radar to the Data Layer.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen('governance')}
          className="lg:w-[170px] flex-shrink-0 text-left border border-[#CBD5E1] rounded bg-[#F7F9FC] flex flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9950C] hover:border-[#9FB2CF] transition-colors"
        >
          <span className="bg-[#0B1F4D] text-white px-3 py-2.5 text-xs font-bold flex gap-2 items-start">
            <Shield size={14} className="flex-shrink-0 mt-px" />
            <span>Governance &amp; Security<span className="block font-medium opacity-75 text-[11px]">applies to every layer</span></span>
          </span>
          <span className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 p-3">
            {ARCH_GOVERNANCE.map((g) => (
              <span key={g.title} className="border-l-[3px] border-[#00338D] pl-2 text-[11.5px] leading-snug">
                <span className="block text-xs font-bold text-[#14213D]">{g.title}</span>
                <span className="text-[#5B6478]">{g.detail}</span>
              </span>
            ))}
          </span>
        </button>
      </div>

      {detail && (
        <DetailModal title={detail.title} subtitle={detail.module} summary={detail.why} width="max-w-xl" onClose={() => setOpen(null)}>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#0077C8] mb-1 flex items-center gap-1.5"><Sparkles size={12} />Where AI acts</div>
              <p className="text-[#1A1F36] leading-relaxed">{detail.ai}</p>
            </div>
            <div className="pt-3 border-t border-[#E2E8F0]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C9950C] mb-1 flex items-center gap-1.5"><Lock size={12} />Human control</div>
              <p className="text-[#1A1F36] leading-relaxed">{detail.human}</p>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  );
}
