'use client';

import type { FourGates } from '@/lib/types';

export function Timeline({ items }: { items: { title: string; meta?: string; detail?: string; tone?: 'navy' | 'green' | 'amber' | 'red' }[] }) {
  const color = { navy: '#00338D', green: '#00A36C', amber: '#D4A017', red: '#DC2626' };
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: color[item.tone ?? 'navy'] }} />
            {i < items.length - 1 && <span className="w-px flex-1 bg-[#E2E8F0]" />}
          </div>
          <div className="pb-4">
            <div className="text-xs font-semibold text-[#1A1F36]">{item.title}</div>
            {item.meta && <div className="text-[10px] text-[#9CA3AF] font-mono">{item.meta}</div>}
            {item.detail && <div className="text-xs text-[#6B7280] mt-0.5">{item.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIRecommendationCard({
  recommendation,
  confidence,
  model,
  version,
  promptVersion,
  timestamp,
  methodology,
  inputs,
}: {
  recommendation: string;
  confidence: number;
  model: string;
  version?: string;
  promptVersion?: string;
  timestamp?: string;
  methodology?: string;
  inputs?: Record<string, unknown>;
}) {
  return (
    <div className="rounded-xl border border-[#00338D]/15 bg-[#00338D]/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#00338D]">AI Recommendation</div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#0077C8]/10 text-[#0077C8] border border-[#0077C8]/20">
          {Math.round(confidence * (confidence > 1 ? 1 : 100))}% confidence
        </span>
      </div>
      <div className="text-sm font-semibold text-[#1A1F36]">{recommendation}</div>
      <p className="text-[11px] text-[#6B7280] mt-2">AI recommendation — human validation required.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6B7280]">
        <div>Model: <span className="font-mono text-[#1A1F36]">{model}</span></div>
        {version && <div>Version: <span className="font-mono text-[#1A1F36]">{version}</span></div>}
        {promptVersion && <div>Prompt: <span className="font-mono text-[#1A1F36]">{promptVersion}</span></div>}
        {timestamp && <div>At: <span className="font-mono text-[#1A1F36]">{timestamp.slice(0, 16).replace('T', ' ')}</span></div>}
      </div>
      {methodology && <p className="text-[11px] text-[#6B7280] mt-2">{methodology}</p>}
      {inputs && (
        <pre className="mt-2 text-[10px] font-mono bg-white rounded-lg border border-[#E2E8F0] p-2 overflow-x-auto">
          {JSON.stringify(inputs, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function DecisionGates({ gates }: { gates: Record<string, string> | FourGates }) {
  const labels: Record<string, string> = {
    rightsOwnership: 'Gate 1 — Rights / Ownership',
    infringementSubstantiated: 'Gate 2 — Infringement Substantiated',
    authorization: 'Gate 3 — Authorization',
    actionableTarget: 'Gate 4 — Actionable Target',
  };
  const entries = Object.entries(gates as Record<string, string>);
  const passed = entries.filter(([, v]) => v === 'pass').length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Four-gate validation</div>
        <div className={`text-sm font-mono font-bold ${passed === 4 ? 'text-[#00A36C]' : 'text-[#D4A017]'}`}>
          {passed} / 4 Gates Passed
        </div>
      </div>
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-3 py-2">
            <span className="text-xs text-[#1A1F36]">{labels[k] ?? k}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${v === 'pass' ? 'text-[#00A36C]' : v === 'hold' ? 'text-[#D4A017]' : 'text-[#DC2626]'}`}>
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${passed === 4 ? 'bg-[#F0FDF4] text-[#00A36C]' : 'bg-[#FFFBEB] text-[#D4A017]'}`}>
        {passed === 4 ? 'GREEN — Eligible for Legal Review' : 'AMBER — Approved Hold / Further Clarification'}
      </div>
    </div>
  );
}

export function ClosedLoopDiagram() {
  const steps = ['D1 Discover', 'D2 Investigate', 'D3 Enforce', 'D4 Track', 'D5 Monitor'];
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Closed-loop enforcement</div>
      <div className="text-xs text-[#6B7280] mb-4">Every enforcement action creates intelligence for the next detection cycle.</div>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#00338D] text-white text-[11px] font-semibold">{s}</div>
            {i < steps.length - 1 && <span className="text-[#9CA3AF]">→</span>}
          </div>
        ))}
        <span className="text-[#9CA3AF]">→</span>
        <div className="px-3 py-1.5 rounded-lg border border-[#8B1E3F]/30 bg-[#8B1E3F]/10 text-[#8B1E3F] text-[11px] font-semibold">
          D1 Discover
        </div>
      </div>
    </div>
  );
}
