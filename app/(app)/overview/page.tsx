'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, Clock, IndianRupee, Radar, ShieldAlert, Target, Timer } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { MetricCard } from '@/components/shared/Card';
import { PageLoader } from '@/components/shared/LoadingDots';
import { ClosedLoopDiagram } from '@/components/shared/Domain';
import { DetailModal } from '@/components/shared/Overlay';

type Slice = { name: string; value: number; pct?: number; color?: string; action?: string };
type PlatformRow = Slice;
type GeoRow = { region: string; value: number; action?: string };
type RemovalRow = { name: string; days: number; vsBlend?: string; action?: string };
type FunnelRow = { stage: string; value: number; insight?: string };

export default function OverviewPage() {
  const { data, loading } = useApi<{
    kpis: Record<string, number>;
    trend: { week: string; exposure: number; cases: number; removals?: number }[];
    platformCounts: PlatformRow[];
    funnel: FunnelRow[];
    riskDist: Slice[];
    flagship: Slice[];
    removalByPlatform: RemovalRow[];
    reappearanceTrend: { week: string; reappearances: number }[];
    geo: GeoRow[];
    emerging: { title: string; detail: string }[];
    alerts: { level: string; text: string }[];
    recurringThreat: number;
    insights?: Record<string, string>;
    kri?: { residualRiskShare: number; riskInsight?: string };
  }>('overview');

  const [openDrilldown, setOpenDrilldown] = useState<string | null>(null);

  if (loading || !data) return <PageLoader label="Loading command center…" />;
  const k = data.kpis;
  const ins = data.insights ?? {};
  const funnelSteps = data.funnel.map((row, i) => {
    const created = data.funnel.find((f) => f.stage === 'Case Created')?.value ?? 0;
    if (row.stage === 'Closed' && created) {
      return { ...row, retained: Math.round((row.value / created) * 100) };
    }
    const prev = data.funnel[i - 1];
    return { ...row, retained: prev ? Math.round((row.value / prev.value) * 100) : 100 };
  });
  const w12 = data.trend[data.trend.length - 1];
  const w11 = data.trend[data.trend.length - 2];
  const lastReapp = data.reappearanceTrend[data.reappearanceTrend.length - 1]?.reappearances ?? 0;

  const DRILLDOWNS: Record<string, { title: string; subtitle?: string; summary: string; render: () => React.ReactNode }> = {
    activeCases: {
      title: 'Active Cases — Detailed Breakdown',
      subtitle: `${k.activeCases} cases currently open across the enforcement pipeline`,
      summary: `There are ${k.activeCases} active cases in the pipeline right now. ${ins.riskCheck ?? ''} ${ins.platformInsight ?? ''}`,
      render: () => (
        <div className="space-y-5">
          <DrilldownDonut title="By risk level" rows={data.riskDist} hint={ins.riskCheck} />
          <DrilldownDonut title="By platform" rows={data.platformCounts} hint={ins.platformInsight} />
        </div>
      ),
    },
    criticalHigh: {
      title: 'Critical / High Risk — Residual Risk KRI',
      subtitle: `${k.criticalHigh} of ${k.activeCases} active cases`,
      summary: `${k.criticalHigh} cases (${data.kri?.residualRiskShare ?? Math.round((k.criticalHigh / k.activeCases) * 100)}% of the active book) are Critical or High risk — these need management attention and should not be deprioritised in favor of lower-risk work.`,
      render: () => (
        <div className="space-y-4">
          <DrilldownDonut title="Risk distribution" rows={data.riskDist} />
          <Callout tone="red">{data.kri?.riskInsight ?? ins.riskCheck}</Callout>
        </div>
      ),
    },
    takedownRate: {
      title: 'Takedown Success Rate — Enforcement Funnel',
      subtitle: `${k.takedownRate}% of dispatched notices result in removal`,
      summary: `Out of every 100 detected findings, ${k.takedownRate}% of the notices that get sent end up successfully removing the content. The funnel below shows exactly where cases drop off between detection and closure — the biggest attrition point is where investigators validate raw detections before a formal case is opened.`,
      render: () => <DrilldownFunnel steps={funnelSteps} hint={ins.funnelInsight} />,
    },
    avgRemovalDays: {
      title: 'Average Removal Time by Platform',
      subtitle: `Blended ${k.avgRemovalDays} days across all platforms`,
      summary: `It takes ${k.avgRemovalDays} days on average to get infringing content removed once a notice is sent. Some platforms respond much faster than others — Telegram is the quickest, while marketplaces and cyberlockers are the slowest and are the platforms most likely to breach SLA if not escalated early.`,
      render: () => <DrilldownRemoval rows={data.removalByPlatform} blend={k.avgRemovalDays} hint={ins.removalInsight} />,
    },
    slaBreachRate: {
      title: 'SLA Breach Rate — KRI',
      subtitle: `${k.slaBreachRate}% of the active book has breached SLA`,
      summary: `${k.slaBreachRate}% of active cases have already missed their SLA deadline and need escalation. Another set of cases are approaching their deadline and should be prioritised now to avoid becoming breaches themselves.`,
      render: () => (
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Breached" value={String(k.slaBreachRate) + '%'} tone="red" />
          <StatBox label="Approaching" value="18 cases" tone="amber" />
          <StatBox label="Within SLA" value="114 cases" tone="green" />
          <div className="col-span-3">
            <Callout tone="amber">{ins.slaCheck}</Callout>
          </div>
        </div>
      ),
    },
    reappearanceRate: {
      title: 'Reappearance Rate — Closed-Loop KRI',
      subtitle: `${k.reappearanceRate}% of monitored removals have reappeared`,
      summary: `${k.reappearanceRate}% of content that was successfully removed has since reappeared somewhere else — usually a mirror or a re-upload by the same uploader. The trend below shows this is rising week over week, which is why every removal keeps a monitoring job open rather than closing the case outright.`,
      render: () => (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.reappearanceTrend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reappearances" name="Linked reappearances" stroke="#8B1E3F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Callout tone="red">{ins.reappInsight}</Callout>
        </div>
      ),
    },
    priorityTitleExposure: {
      title: 'Priority Title Exposure',
      subtitle: `${k.priorityTitleExposure}% of the live book is flagship SKUs`,
      summary: `${k.priorityTitleExposure}% of all active cases involve S. Chand's flagship titles (Aggarwal, Lakhmir Singh, Wren & Martin, NEET) — these carry the highest commercial risk, so investigator capacity should stay concentrated here rather than being pulled to clear the non-flagship queue.`,
      render: () => <DrilldownDonut title="Flagship vs. non-flagship" rows={data.flagship} hint={ins.flagshipInsight} />,
    },
    estimatedExposureCr: {
      title: 'Estimated Exposure Value',
      subtitle: `₹${k.estimatedExposureCr} Cr indicative financial exposure`,
      summary: `The estimated ₹${k.estimatedExposureCr} Cr exposure figure comes from multiplying the number of unauthorized copies in circulation by an indicative per-copy value — it's a modelled estimate for prioritisation, not a real observed loss. Geographic exposure below shows where that risk is concentrated.`,
      render: () => (
        <div className="space-y-4">
          <Callout tone="amber">{ins.financialCheck}</Callout>
          <DrilldownGeo rows={data.geo} hint={ins.geoInsight} />
        </div>
      ),
    },
    trendChart: {
      title: 'Piracy Exposure Trend',
      subtitle: '12-week exposure index vs. new cases and removals',
      summary: `The exposure index has climbed from a baseline of 100 in W11 to ${w12?.exposure ?? '—'} in W12 — a rise driven by exam-season demand. New case intake is growing too, but not as fast as the exposure index itself, meaning piracy is outpacing the team's ability to detect it week over week.`,
      render: () => (
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="exposure" name="Exposure index (W11=100)" stroke="#00338D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cases" name="New cases" stroke="#0077C8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="removals" name="Removals" stroke="#00A36C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Callout tone="amber">
            Exam-season KRI: W12 index {w12?.exposure} vs W11 {w11?.exposure} = +{Math.round((((w12?.exposure ?? 0) / (w11?.exposure ?? 1)) - 1) * 100)}%. Index is rising faster than weekly case intake.
          </Callout>
        </div>
      ),
    },
    platformChart: {
      title: 'Cases by Platform',
      subtitle: 'Distribution of active cases across discovery platforms',
      summary: `Telegram carries the largest share of active cases and is the dominant distribution channel to monitor daily. Google Drive is notable because pirated folders tend to reconstitute even after a folder-level takedown, so it needs repeat checks rather than a single removal action.`,
      render: () => <DrilldownDonut title="Platform mix" rows={data.platformCounts} hint={ins.platformInsight} />,
    },
  };

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1F36]">Anti-Piracy Command Center</h1>
          <p className="text-sm text-[#6B7280] mt-1">Enterprise IP Protection & Enforcement Overview · S. Chand & Company</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Active Cases" value={k.activeCases} icon={Activity} color="#00338D" onDoubleClick={() => setOpenDrilldown('activeCases')} />
        <MetricCard label="Critical / High Risk" value={k.criticalHigh} icon={ShieldAlert} color="#DC2626" onDoubleClick={() => setOpenDrilldown('criticalHigh')} />
        <MetricCard label="Takedown Success Rate" value={k.takedownRate} unit="%" icon={Target} color="#00A36C" onDoubleClick={() => setOpenDrilldown('takedownRate')} />
        <MetricCard label="Avg. Removal Time" value={k.avgRemovalDays} unit="days" icon={Timer} color="#0077C8" onDoubleClick={() => setOpenDrilldown('avgRemovalDays')} />
        <MetricCard label="SLA Breach Rate" value={k.slaBreachRate} unit="%" icon={Clock} color="#D4A017" onDoubleClick={() => setOpenDrilldown('slaBreachRate')} />
        <MetricCard label="Reappearance Rate" value={k.reappearanceRate} unit="%" icon={Radar} color="#8B1E3F" onDoubleClick={() => setOpenDrilldown('reappearanceRate')} />
        <MetricCard label="Priority Title Exposure" value={k.priorityTitleExposure} unit="%" icon={AlertTriangle} color="#D4A017" onDoubleClick={() => setOpenDrilldown('priorityTitleExposure')} />
        <MetricCard label="Estimated Exposure Value" value={`₹${k.estimatedExposureCr}`} unit="Cr" icon={IndianRupee} color="#00338D" onDoubleClick={() => setOpenDrilldown('estimatedExposureCr')} />
      </div>
      <p className="text-[11px] text-[#9CA3AF]">Double-click any tile or chart for a detailed breakdown.</p>
      <p className="text-[11px] text-[#9CA3AF]">
        Synthetic / demonstration pack. Takedown {k.takedownRate}% = 138 removed / 156 notices. Critical+High {k.criticalHigh} / {k.activeCases} active ({Math.round((k.criticalHigh / k.activeCases) * 100)}% KRI). Reappearance {k.reappearanceRate}% = 16 / 143 monitored. Exposure ₹{k.estimatedExposureCr} Cr = 4,20,000 copies × ₹443 (FIN-v0.1, medium confidence).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.alerts.map((a) => (
          <div key={a.level} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 border-l-[3px]" style={{ borderLeftColor: a.level === 'CRITICAL' ? '#DC2626' : a.level === 'HIGH' ? '#D4A017' : '#0077C8' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{a.level}</div>
            <div className="text-sm font-semibold text-[#1A1F36]">{a.text}</div>
          </div>
        ))}
      </div>
      {data.recurringThreat > 0 && (
        <div className="rounded-2xl border border-[#8B1E3F]/20 bg-[#8B1E3F]/5 p-4 text-sm text-[#8B1E3F] font-semibold">
          RECURRING THREAT DETECTED — {data.recurringThreat} reappearances on the monitored book. Closed-loop recovery {k.closedLoopRecoveryRate}%.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Piracy Exposure Trend" hint={ins.trendCheck} onDoubleClick={() => setOpenDrilldown('trendChart')}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="exposure" name="Exposure index (W11=100)" stroke="#00338D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cases" name="New cases" stroke="#0077C8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="removals" name="Removals" stroke="#00A36C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Callout tone="amber">
            Exam-season KRI: W12 index {w12?.exposure} vs W11 {w11?.exposure} = +{Math.round((((w12?.exposure ?? 0) / (w11?.exposure ?? 1)) - 1) * 100)}%. Index is rising faster than weekly case intake.
          </Callout>
        </ChartCard>

        <ChartCard title="Cases by Platform" hint={ins.platformInsight} onDoubleClick={() => setOpenDrilldown('platformChart')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.platformCounts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.platformCounts.map((row) => (
                    <Cell key={row.name} fill={row.color ?? '#00338D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <SliceList rows={data.platformCounts} />
          </div>
          <Callout tone="red">Telegram = {data.platformCounts[0]?.value} of {k.activeCases} ({data.platformCounts[0]?.pct}%) — treat as the primary distribution KRI, not a channel mix footnote.</Callout>
        </ChartCard>

        <ChartCard title="Enforcement Funnel" hint={ins.funnelInsight}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelSteps} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" width={88} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {funnelSteps.map((row) => (
              <div key={row.stage} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-semibold text-[#1A1F36] w-28 shrink-0">{row.stage}</span>
                <span className="font-mono text-[#1A1F36] w-16">{row.value.toLocaleString()}</span>
                <span className="text-[#6B7280] flex-1">{row.insight}</span>
                <span className="font-mono text-[11px] text-[#9CA3AF] w-14 text-right">{row.stage === 'Closed' ? `${row.retained}% of created` : row.stage === 'Detected' ? 'intake' : `${row.retained}% kept`}</span>
              </div>
            ))}
          </div>
          <Callout tone="green">Takedown KPI {k.takedownRate}% once a notice is sent. The drop to watch is Detected → Validated ({funnelSteps[1]?.retained}% survive).</Callout>
        </ChartCard>

        <ChartCard title="Risk Distribution" hint={data.kri?.riskInsight ?? ins.riskCheck}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.riskDist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                  {data.riskDist.map((row) => (
                    <Cell key={row.name} fill={row.color ?? '#0077C8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} cases`, String(name)]} />
              </PieChart>
            </ResponsiveContainer>
            <SliceList rows={data.riskDist} />
          </div>
          <Callout tone="red">Critical + High = {k.criticalHigh} cases ({data.kri?.residualRiskShare}%) — residual risk KRI. Do not staff these from the Low queue.</Callout>
        </ChartCard>

        <ChartCard title="Priority Title Exposure" hint={ins.flagshipInsight}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.flagship} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                  {data.flagship.map((row) => (
                    <Cell key={row.name} fill={row.color ?? '#00338D'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} cases`, String(name)]} />
              </PieChart>
            </ResponsiveContainer>
            <SliceList rows={data.flagship} />
          </div>
          <Callout tone="amber">{k.priorityTitleExposure}% of the live book is flagship SKUs. Investigator capacity should stay on Aggarwal, Lakhmir Singh, Wren & Martin and NEET.</Callout>
        </ChartCard>

        <ChartCard title="Average Removal Time by Platform" hint={ins.removalInsight}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.removalByPlatform}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="d" />
              <Tooltip />
              <ReferenceLine y={k.avgRemovalDays} stroke="#D4A017" strokeDasharray="4 4" label={{ value: `Blend ${k.avgRemovalDays}d`, fill: '#D4A017', fontSize: 10, position: 'right' }} />
              <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                {data.removalByPlatform.map((row) => (
                  <Cell key={row.name} fill={row.vsBlend === 'faster' ? '#00A36C' : '#8B1E3F'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {data.removalByPlatform.map((row) => (
              <div key={row.name} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-semibold w-28 shrink-0">{row.name}</span>
                <span className="font-mono w-12">{row.days}d</span>
                <span className="text-[#6B7280] flex-1">{row.action}</span>
              </div>
            ))}
          </div>
          <Callout tone="amber">Green bars beat the {k.avgRemovalDays}-day blend. Marketplaces (3.4d) and cyberlockers (4.1d) are the SLA risk — escalate earlier, do not wait for the mean.</Callout>
        </ChartCard>

        <ChartCard title="Reappearance Trend" hint={ins.reappInsight}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.reappearanceTrend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reappearances" name="Linked reappearances" stroke="#8B1E3F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <Callout tone="red">
            W12 linked {lastReapp} reappearances vs 1 in W1. KRI {k.reappearanceRate}% = 16 / 143 monitored. Confirm the relationship — do not auto-send a second notice.
          </Callout>
        </ChartCard>

        <ChartCard title="Geographic Exposure" hint={ins.geoInsight}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.geo} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="region" width={88} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.geo.map((row) => (
                    <Cell key={row.region} fill={row.region === 'North India' || row.region === 'West India' ? '#8B1E3F' : row.region === 'UAE / GCC' ? '#D4A017' : '#00338D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {data.geo.map((row) => (
                <div key={row.region}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#1A1F36]">{row.region}</span>
                    <span className="font-mono">{row.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div className="h-full rounded-full bg-[#00338D]" style={{ width: `${row.value}%` }} />
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] mt-0.5">{row.action}</div>
                </div>
              ))}
            </div>
          </div>
          <Callout tone="amber">North + West = 56% of share. UAE/GCC 9% is the same Telegram ring, not a separate overseas programme.</Callout>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Top Emerging Threats</div>
          <div className="space-y-3">
            {data.emerging.map((t) => (
              <div key={t.title}>
                <div className="text-xs font-semibold text-[#1A1F36]">{t.title}</div>
                <div className="text-xs text-[#6B7280]">{t.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <ClosedLoopDiagram />
      </div>

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

function ChartCard({ title, hint, children, onDoubleClick }: { title: string; hint?: string; children: React.ReactNode; onDoubleClick?: () => void }) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] transition-all duration-200 ${onDoubleClick ? 'cursor-pointer hover:shadow-[0_4px_12px_rgba(0,51,141,0.1)]' : ''}`}
    >
      <div className="text-xs font-semibold text-[#1A1F36]">{title}</div>
      {hint && <p className="text-[11px] text-[#6B7280] mt-1 mb-3 leading-relaxed">{hint}</p>}
      <div className={hint ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'green' }) {
  const cls = {
    red: 'bg-[#FEF2F2] text-[#DC2626] border-red-100',
    amber: 'bg-[#FFFBEB] text-[#92400E] border-amber-100',
    green: 'bg-[#F0FDF4] text-[#166534] border-green-100',
  }[tone];
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <div className="text-lg font-bold font-mono">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function DrilldownDonut({ title, rows, hint }: { title: string; rows: Slice[]; hint?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-[#1A1F36] mb-2">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
              {rows.map((row) => (
                <Cell key={row.name} fill={row.color ?? '#0077C8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} cases`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
        <SliceList rows={rows} />
      </div>
      {hint && <Callout tone="amber">{hint}</Callout>}
    </div>
  );
}

function DrilldownFunnel({ steps, hint }: { steps: (FunnelRow & { retained: number })[]; hint?: string }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={steps} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {steps.map((row) => (
          <div key={row.stage} className="flex items-start justify-between gap-3 text-xs">
            <span className="font-semibold text-[#1A1F36] w-32 shrink-0">{row.stage}</span>
            <span className="font-mono text-[#1A1F36] w-16">{row.value.toLocaleString()}</span>
            <span className="text-[#6B7280] flex-1">{row.insight}</span>
          </div>
        ))}
      </div>
      {hint && <Callout tone="green">{hint}</Callout>}
    </div>
  );
}

function DrilldownRemoval({ rows, blend, hint }: { rows: RemovalRow[]; blend: number; hint?: string }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} unit="d" />
          <Tooltip />
          <ReferenceLine y={blend} stroke="#D4A017" strokeDasharray="4 4" label={{ value: `Blend ${blend}d`, fill: '#D4A017', fontSize: 10, position: 'right' }} />
          <Bar dataKey="days" radius={[6, 6, 0, 0]}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.vsBlend === 'faster' ? '#00A36C' : '#8B1E3F'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-start justify-between gap-3 text-xs">
            <span className="font-semibold w-28 shrink-0">{row.name}</span>
            <span className="font-mono w-12">{row.days}d</span>
            <span className="text-[#6B7280] flex-1">{row.action}</span>
          </div>
        ))}
      </div>
      {hint && <Callout tone="amber">{hint}</Callout>}
    </div>
  );
}

function DrilldownGeo({ rows, hint }: { rows: GeoRow[]; hint?: string }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="region" width={88} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {rows.map((row) => (
              <Cell key={row.region} fill={row.region === 'North India' || row.region === 'West India' ? '#8B1E3F' : row.region === 'UAE / GCC' ? '#D4A017' : '#00338D'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hint && <Callout tone="amber">{hint}</Callout>}
    </div>
  );
}

function SliceList({ rows }: { rows: Slice[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-[#1A1F36] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-mono text-[#1A1F36]">{row.value}{row.pct != null ? ` · ${row.pct}%` : ''}</span>
          </div>
          {row.pct != null && (
            <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
            </div>
          )}
          {row.action && <div className="text-[10px] text-[#9CA3AF] mt-0.5">{row.action}</div>}
        </div>
      ))}
    </div>
  );
}

function Callout({ children, tone }: { children: React.ReactNode; tone: 'red' | 'amber' | 'green' }) {
  const cls = {
    red: 'bg-[#FEF2F2] border-red-100 text-[#DC2626]',
    amber: 'bg-[#FFFBEB] border-amber-100 text-[#92400E]',
    green: 'bg-[#F0FDF4] border-green-100 text-[#166534]',
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold mt-3 leading-relaxed ${cls}`}>{children}</div>;
}
