'use client';

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
import { SyntheticBanner } from '@/components/shared/Overlay';
import { ClosedLoopDiagram } from '@/components/shared/Domain';

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

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Anti-Piracy Command Center</h1>
          <p className="text-sm text-[#6B7280] mt-1">Enterprise IP Protection & Enforcement Overview · S. Chand & Company</p>
        </div>
        <SyntheticBanner />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Active Cases" value={k.activeCases} icon={Activity} color="#c83328" />
        <MetricCard label="Critical / High Risk" value={k.criticalHigh} icon={ShieldAlert} color="#DC2626" />
        <MetricCard label="Takedown Success Rate" value={k.takedownRate} unit="%" icon={Target} color="#00A36C" />
        <MetricCard label="Avg. Removal Time" value={k.avgRemovalDays} unit="days" icon={Timer} color="#c83328" />
        <MetricCard label="SLA Breach Rate" value={k.slaBreachRate} unit="%" icon={Clock} color="#D4A017" />
        <MetricCard label="Reappearance Rate" value={k.reappearanceRate} unit="%" icon={Radar} color="#c83328" />
        <MetricCard label="Priority Title Exposure" value={k.priorityTitleExposure} unit="%" icon={AlertTriangle} color="#D4A017" />
        <MetricCard label="Estimated Exposure Value" value={`₹${k.estimatedExposureCr}`} unit="Cr" icon={IndianRupee} color="#c83328" />
      </div>
      <p className="text-[11px] text-[#9CA3AF]">
        Synthetic / demonstration pack. Takedown {k.takedownRate}% = 138 removed / 156 notices. Critical+High {k.criticalHigh} / {k.activeCases} active ({Math.round((k.criticalHigh / k.activeCases) * 100)}% KRI). Reappearance {k.reappearanceRate}% = 16 / 143 monitored. Exposure ₹{k.estimatedExposureCr} Cr = 4,20,000 copies × ₹443 (FIN-v0.1, medium confidence).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.alerts.map((a) => (
          <div key={a.level} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 border-l-[3px]" style={{ borderLeftColor: a.level === 'CRITICAL' ? '#DC2626' : a.level === 'HIGH' ? '#D4A017' : '#c83328' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{a.level}</div>
            <div className="text-sm font-semibold text-[#111111]">{a.text}</div>
          </div>
        ))}
      </div>
      {data.recurringThreat > 0 && (
        <div className="rounded-2xl border border-[#c83328]/20 bg-[#c83328]/5 p-4 text-sm text-[#c83328] font-semibold">
          RECURRING THREAT DETECTED — {data.recurringThreat} reappearances on the monitored book. Closed-loop recovery {k.closedLoopRecoveryRate}%.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Piracy Exposure Trend" hint={ins.trendCheck}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="exposure" name="Exposure index (W11=100)" stroke="#c83328" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cases" name="New cases" stroke="#111111" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="removals" name="Removals" stroke="#00A36C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Callout tone="amber">
            Exam-season KRI: W12 index {w12?.exposure} vs W11 {w11?.exposure} = +{Math.round((((w12?.exposure ?? 0) / (w11?.exposure ?? 1)) - 1) * 100)}%. Index is rising faster than weekly case intake.
          </Callout>
        </ChartCard>

        <ChartCard title="Cases by Platform" hint={ins.platformInsight}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.platformCounts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.platformCounts.map((row) => (
                    <Cell key={row.name} fill={row.color ?? '#c83328'} />
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
              <Bar dataKey="value" fill="#c83328" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {funnelSteps.map((row) => (
              <div key={row.stage} className="flex items-start justify-between gap-3 text-xs">
                <span className="font-semibold text-[#111111] w-28 shrink-0">{row.stage}</span>
                <span className="font-mono text-[#111111] w-16">{row.value.toLocaleString()}</span>
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
                    <Cell key={row.name} fill={row.color ?? '#c83328'} />
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
                    <Cell key={row.name} fill={row.color ?? '#c83328'} />
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
                  <Cell key={row.name} fill={row.vsBlend === 'faster' ? '#00A36C' : '#c83328'} />
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
              <Line type="monotone" dataKey="reappearances" name="Linked reappearances" stroke="#c83328" strokeWidth={2} />
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
                    <Cell key={row.region} fill={row.region === 'North India' || row.region === 'West India' ? '#c83328' : row.region === 'UAE / GCC' ? '#D4A017' : '#c83328'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {data.geo.map((row) => (
                <div key={row.region}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#111111]">{row.region}</span>
                    <span className="font-mono">{row.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div className="h-full rounded-full bg-[#c83328]" style={{ width: `${row.value}%` }} />
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
                <div className="text-xs font-semibold text-[#111111]">{t.title}</div>
                <div className="text-xs text-[#6B7280]">{t.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <ClosedLoopDiagram />
      </div>
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]">
      <div className="text-xs font-semibold text-[#111111]">{title}</div>
      {hint && <p className="text-[11px] text-[#6B7280] mt-1 mb-3 leading-relaxed">{hint}</p>}
      <div className={hint ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function SliceList({ rows }: { rows: Slice[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-[#111111] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-mono text-[#111111]">{row.value}{row.pct != null ? ` · ${row.pct}%` : ''}</span>
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
