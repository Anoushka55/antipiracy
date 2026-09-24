'use client';

import { useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Drawer, DetailModal } from '@/components/shared/Overlay';
import { AIRecommendationCard } from '@/components/shared/Domain';
import { KPICard } from '@/components/shared/Card';
import type { FinancialEstimate } from '@/lib/types';

type FunnelRow = { stage: string; value: number; insight?: string };

export default function AnalyticsPage() {
  const { data, loading } = useApi<{
    overview: {
      kpis: Record<string, number>;
      trend: { week: string; exposure: number }[];
      funnel: FunnelRow[];
      geo: { region: string; value: number; action?: string }[];
      reappearanceTrend: { week: string; reappearances: number }[];
      insights?: Record<string, string>;
    };
    forecast: { statement: string; confidence: string; methodologyVersion: string };
    financial: FinancialEstimate[];
    ai: { matchModel: string; matchVersion: string; promptVersion: string };
  }>('analytics');
  const [fin, setFin] = useState<FinancialEstimate | null>(null);
  const [openDrilldown, setOpenDrilldown] = useState<string | null>(null);
  if (loading || !data) return <PageLoader />;
  const f = data.financial[0];
  const ins = data.overview.insights ?? {};

  const DRILLDOWNS: Record<string, { title: string; subtitle?: string; summary: string; render: () => React.ReactNode }> = {
    closedLoopRecovery: {
      title: 'Closed-loop Recovery — Reappearance Trend',
      subtitle: `${data.overview.kpis.closedLoopRecoveryRate}% of detected reappearances are linked back to their original case`,
      summary: `${data.overview.kpis.closedLoopRecoveryRate}% of the time, when previously-removed content resurfaces, the system successfully links it back to the original case rather than treating it as a brand-new finding. This is what keeps enforcement history and evidence lineage intact across repeat infringements.`,
      render: () => (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.overview.reappearanceTrend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reappearances" name="Linked reappearances" stroke="#8B1E3F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#6B7280] leading-relaxed">{ins.reappInsight}</p>
        </div>
      ),
    },
    reappearanceRate: {
      title: 'Reappearance Rate — KRI',
      subtitle: `${data.overview.kpis.reappearanceRate}% of the monitored book has resurfaced`,
      summary: `${data.overview.kpis.reappearanceRate}% of removed content has come back somewhere else, usually as a mirror or re-upload. This is why every removal keeps a monitoring job running rather than closing the case immediately.`,
      render: () => (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.overview.reappearanceTrend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reappearances" name="Linked reappearances" stroke="#8B1E3F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#6B7280] leading-relaxed">{ins.reappCheck}</p>
        </div>
      ),
    },
    estimatedExposure: {
      title: 'Estimated Exposure Value',
      subtitle: `₹${data.overview.kpis.estimatedExposureCr} Cr indicative financial exposure`,
      summary: `The ₹${data.overview.kpis.estimatedExposureCr} Cr figure is a modelled estimate — unauthorized copies in circulation multiplied by an indicative per-copy value — not an observed real-world loss. It's meant to help prioritise where to focus enforcement, and the regional breakdown below shows where that exposure is concentrated.`,
      render: () => (
        <div className="space-y-4">
          <p className="text-xs text-[#6B7280] leading-relaxed">{ins.financialCheck}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.overview.geo} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="region" width={88} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#00338D" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#6B7280] leading-relaxed">{ins.geoInsight}</p>
        </div>
      ),
    },
    takedownSuccess: {
      title: 'Takedown Success — Enforcement Funnel',
      subtitle: `${data.overview.kpis.takedownRate}% of dispatched notices result in removal`,
      summary: `${data.overview.kpis.takedownRate}% of notices that get sent to a platform successfully result in the content being removed. The funnel below shows every stage a finding passes through before it gets to that point, and where the biggest drop-offs happen.`,
      render: () => (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.overview.funnel} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {data.overview.funnel.map((row) => (
              <div key={row.stage} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-semibold text-[#1A1F36] w-32 shrink-0">{row.stage}</span>
                <span className="font-mono text-[#1A1F36] w-16">{row.value.toLocaleString()}</span>
                <span className="text-[#6B7280] flex-1">{row.insight}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">{ins.funnelInsight}</p>
        </div>
      ),
    },
    aiRecommendation: {
      title: 'AI Recommendation — Full Detail',
      subtitle: 'Methodology, model provenance, and confidence for this forecast',
      summary: 'This forecast is generated by a deterministic, rule-based model — not a live AI call — and is explicitly a scenario, not a fact. It always requires human validation before anyone acts on it; the details below show exactly which model, version, and methodology produced this specific recommendation.',
      render: () => (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Recommendation</div>
            <p className="text-[#1A1F36]">{data.forecast.statement}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Numeric confidence" value="62%" tone="blue" />
            <StatBox label="Qualitative confidence" value={data.forecast.confidence} tone="amber" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Model provenance</div>
            <div className="grid grid-cols-3 gap-2 text-xs text-[#6B7280]">
              <div>Model: <span className="font-mono text-[#1A1F36]">{data.ai.matchModel}</span></div>
              <div>Version: <span className="font-mono text-[#1A1F36]">{data.ai.matchVersion}</span></div>
              <div>Prompt: <span className="font-mono text-[#1A1F36]">{data.ai.promptVersion}</span></div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Methodology</div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Methodology version {data.forecast.methodologyVersion}. Confidence: {data.forecast.confidence}. Do not treat as a fact.
            </p>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Inputs</div>
            <p className="text-xs text-[#9CA3AF] italic">No raw input payload is captured for this recommendation type.</p>
          </div>
          <p className="text-[11px] text-[#6B7280] pt-2 border-t border-[#E2E8F0]">AI recommendation — human validation required.</p>
        </div>
      ),
    },
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Risk & Predictive Analytics</h1>
          <p className="text-sm text-[#6B7280]">Deterministic synthetic AI outputs. Predictions are not presented as facts.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Closed-loop recovery (KPI)" value={`${data.overview.kpis.closedLoopRecoveryRate}%`} unit="linked reappearances / detected" statusColor="#00A36C" onDoubleClick={() => setOpenDrilldown('closedLoopRecovery')} />
        <KPICard title="Reappearance rate (KRI)" value={`${data.overview.kpis.reappearanceRate}%`} unit="16 of 143 monitored" statusColor="#8B1E3F" onDoubleClick={() => setOpenDrilldown('reappearanceRate')} />
        <KPICard title="Estimated exposure" value={`₹${data.overview.kpis.estimatedExposureCr} Cr`} unit="4.2 lakh copies × ₹443" statusColor="#8B1E3F" onDoubleClick={() => setOpenDrilldown('estimatedExposure')} />
        <KPICard title="Takedown success (KPI)" value={`${data.overview.kpis.takedownRate}%`} unit="138 / 156 notices" statusColor="#00A36C" onDoubleClick={() => setOpenDrilldown('takedownSuccess')} />
      </div>
      <p className="text-[11px] text-[#6B7280]">W12 exposure index 118 vs W11 100 = +18% exam-season KRI. Forecast is a scenario, not a fact. Double-click any tile or the AI card for detail.</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-xs font-semibold mb-1">Exposure index (12 weeks)</div>
          <div className="text-[11px] text-[#6B7280] mb-3">Index 100 = W11 baseline. W12 = 118 (+18% week-on-week into board exams).</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.overview.trend}>
              <CartesianGrid stroke="#E2E8F0" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line dataKey="exposure" stroke="#00338D" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
          <AIRecommendationCard
            recommendation={data.forecast.statement}
            confidence={0.62}
            model={data.ai.matchModel}
            version={data.ai.matchVersion}
            promptVersion={data.ai.promptVersion}
            methodology={`Methodology version ${data.forecast.methodologyVersion}. Confidence: ${data.forecast.confidence}. Do not treat as a fact.`}
            onDoubleClick={() => setOpenDrilldown('aiRecommendation')}
          />
        </div>
      </div>
      {f && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Estimated Exposure</div>
              <div className="font-mono font-bold text-3xl">₹{((f.valueInr) / 10000000).toFixed(1)} Cr</div>
              <div className="text-xs text-[#6B7280] mt-1">Reconciles to dashboard KPI ₹18.6 Cr = 4,20,000 × ₹443</div>
              <div className="text-xs text-[#6B7280]">Confidence: {f.confidence} · {f.methodology}</div>
            </div>
            <button className="text-xs text-[#00338D] font-semibold" onClick={() => setFin(f)}>View methodology</button>
          </div>
        </div>
      )}
      {fin && (
        <Drawer title="Financial methodology" onClose={() => setFin(null)}>
          <div className="text-xs space-y-2">
            <div><b>Input</b> <pre className="font-mono bg-[#F4F6F9] p-2 rounded-lg">{JSON.stringify(fin.input, null, 2)}</pre></div>
            <div><b>Assumption</b> {fin.assumption}</div>
            <div><b>Formula</b> {fin.formula}</div>
            <div><b>Methodology</b> {fin.methodology} ({fin.methodologyVersion})</div>
            <div><b>Confidence</b> {fin.confidence}</div>
            <div><b>Timestamp</b> {fin.timestamp}</div>
            <p className="text-[#9CA3AF]">Illustrative estimate for demonstration only. Not a real-world loss figure.</p>
          </div>
        </Drawer>
      )}
      {openDrilldown && DRILLDOWNS[openDrilldown] && (
        <DetailModal
          title={DRILLDOWNS[openDrilldown].title}
          subtitle={DRILLDOWNS[openDrilldown].subtitle}
          summary={DRILLDOWNS[openDrilldown].summary}
          onClose={() => setOpenDrilldown(null)}
        >
          {DRILLDOWNS[openDrilldown].render()}
        </DetailModal>
      )}
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'green' | 'blue' }) {
  const cls = {
    red: 'bg-[#FEF2F2] text-[#DC2626] border-red-100',
    amber: 'bg-[#FFFBEB] text-[#92400E] border-amber-100',
    green: 'bg-[#F0FDF4] text-[#166534] border-green-100',
    blue: 'bg-[#EFF6FF] text-[#0077C8] border-blue-100',
  }[tone];
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-semibold mt-0.5">{label}</div>
    </div>
  );
}
