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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { PageLoader } from '@/components/shared/LoadingDots';
import { SyntheticBanner } from '@/components/shared/Overlay';

const COLORS = ['#DC2626', '#D4A017', '#0077C8', '#00A36C', '#8B1E3F', '#00338D'];

type LlmCharts = {
  exposure: { model: string; 'Drive 1 elicitation': number; 'Drive 2 reconstruction': number }[];
  highRisk: { model: string; high: number; highPct: number }[];
  forensic: { model: string; similarity: number; highSimilarity: number; inconsistent: number }[];
};

type ReportPayload = {
  title: string;
  generatedAt: string;
  sections: { heading: string; body: string }[];
  charts: { title: string; kind: string; dataKey: string; hint?: string }[];
  llm?: LlmCharts | null;
  overview: {
    kpis: Record<string, number>;
    insights: Record<string, string>;
    trend: { week: string; exposure: number; cases: number; removals: number; reappearances: number }[];
    funnel: { stage: string; value: number }[];
    riskDist: { name: string; value: number; pct?: number; color?: string; action?: string }[];
    platformCounts: { name: string; value: number }[];
    flagship: { name: string; value: number }[];
    removalByPlatform: { name: string; days: number }[];
    reappearanceTrend: { week: string; reappearances: number }[];
    geo: { region: string; value: number }[];
    kri?: { residualRiskShare: number; riskInsight?: string };
  };
};

export default function ReportsPage() {
  const { data, loading } = useApi<{ types: string[] }>('reports');
  const [type, setType] = useState('Executive Anti-Piracy Report');
  const [preview, setPreview] = useState<ReportPayload | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const r = await api<ReportPayload>(`report?type=${encodeURIComponent(type)}`);
      setPreview(r);
    } finally {
      setBusy(false);
    }
  }

  function exportFile(kind: 'csv' | 'json') {
    if (!preview) return;
    const blob = new Blob(
      [kind === 'json' ? JSON.stringify(preview, null, 2) : toCsv(preview)],
      { type: kind === 'json' ? 'application/json' : 'text/csv' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schand-${type.replace(/\s+/g, '-').toLowerCase()}.${kind === 'json' ? 'json' : 'csv'}`;
    a.click();
  }

  if (loading || !data) return <PageLoader />;
  const ov = preview?.overview;
  const k = ov?.kpis;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-[#6B7280]">KPI / KRI pack is internally consistent — charts, cards and narrative use the same numbers.</p>
        </div>
        <SyntheticBanner />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Report type</div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2E8F0]">
            {data.types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input className="px-3 py-2 rounded-lg border border-[#E2E8F0]" defaultValue="2026-06-14" />
            <input className="px-3 py-2 rounded-lg border border-[#E2E8F0]" defaultValue="2026-09-04" />
          </div>
          <Button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate Report'}</Button>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={!preview} onClick={() => exportFile('json')}>Export JSON / PDF payload</Button>
            <Button size="sm" variant="outline" disabled={!preview} onClick={() => exportFile('csv')}>Export CSV / Excel</Button>
          </div>
          {k && (
            <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-[11px]">
              <Kri label="Active (KPI)" value={k.activeCases} />
              <Kri label="Takedown (KPI)" value={`${k.takedownRate}%`} />
              <Kri label="Crit+High (KRI)" value={k.criticalHigh} />
              <Kri label="SLA breach (KRI)" value={`${k.slaBreachRate}%`} />
              <Kri label="Reappear (KRI)" value={`${k.reappearanceRate}%`} />
              <Kri label="Priority exp. (KRI)" value={`${k.priorityTitleExposure}%`} />
            </div>
          )}
        </div>
        <div className="lg:col-span-3 space-y-4">
          {!preview && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 min-h-[220px] text-xs text-[#6B7280]">
              Generate a report to see charts and validated insights. Funnel, risk mix and platform charts are forced to reconcile to the 142-case book.
            </div>
          )}
          {preview && ov && (
            <>
              {preview.charts.map((c) => (
                <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                  <div className="text-xs font-semibold text-[#1A1F36]">{c.title}</div>
                  {c.hint && <p className="text-[11px] text-[#6B7280] mt-1 mb-3 leading-relaxed">{c.hint}</p>}
                  <div className={c.hint ? '' : 'mt-3'}>
                    <ChartBlock kind={c.kind} dataKey={c.dataKey} ov={ov} llm={preview.llm} />
                  </div>
                </div>
              ))}
              <article className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3 text-sm ai-output">
                <h2>{preview.title}</h2>
                <p className="text-xs text-[#6B7280]">S. Chand & Company · {preview.generatedAt.slice(0, 16).replace('T', ' ')} UTC · synthetic demonstration data</p>
                {preview.sections.map((s) => (
                  <div key={s.heading}>
                    <h3>{s.heading}</h3>
                    <p>{s.body}</p>
                  </div>
                ))}
                {ov.insights && (
                  <div className="rounded-xl bg-[#F4F6F9] p-3 text-[11px] text-[#6B7280] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Reconciliation</div>
                    <div>{ov.insights.takedownCheck}</div>
                    <div>{ov.insights.riskCheck}</div>
                    <div>{ov.insights.mixCheck}</div>
                    <div>{ov.insights.financialCheck}</div>
                  </div>
                )}
              </article>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kri({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] px-2 py-1.5">
      <div className="text-[#9CA3AF]">{label}</div>
      <div className="font-mono font-bold text-[#1A1F36]">{value}</div>
    </div>
  );
}

function ChartBlock({ kind, dataKey, ov, llm }: { kind: string; dataKey: string; ov: ReportPayload['overview']; llm?: LlmCharts | null }) {
  if (kind === 'line') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={ov.trend}>
          <CartesianGrid stroke="#E2E8F0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="exposure" name="Exposure index" stroke="#00338D" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cases" name="New cases" stroke="#0077C8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="removals" name="Removals" stroke="#00A36C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'funnel') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={ov.funnel} layout="vertical">
          <CartesianGrid stroke="#E2E8F0" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'pie') {
    const data = dataKey === 'flagship' ? ov.flagship : ov.riskDist;
    const isRisk = dataKey !== 'flagship';
    return (
      <div className={isRisk ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-center' : ''}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={isRisk ? 2 : 0}>
            {data.map((row, i) => (
              <Cell key={`${String((row as { name: string }).name)}-${i}`} fill={'color' in row && typeof row.color === 'string' ? row.color : COLORS[i % COLORS.length]} />
            ))}
            </Pie>
            <Tooltip />
            {!isRisk && <Legend />}
          </PieChart>
        </ResponsiveContainer>
        {isRisk && (
          <div className="space-y-2">
            {ov.riskDist.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
                  {row.name}
                </span>
                <span className="font-mono">{row.value} · {row.pct}%</span>
              </div>
            ))}
            <div className="text-[11px] text-[#DC2626] font-semibold pt-1">
              Critical + High = {ov.kpis.criticalHigh} ({ov.kri?.residualRiskShare}%) residual-risk KRI
            </div>
          </div>
        )}
      </div>
    );
  }
  if (kind === 'bar') {
    const data = dataKey === 'removalByPlatform' ? ov.removalByPlatform : ov.platformCounts;
    const key = dataKey === 'removalByPlatform' ? 'days' : 'value';
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={key} fill="#0077C8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'reapp') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={ov.reappearanceTrend}>
          <CartesianGrid stroke="#E2E8F0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="reappearances" stroke="#8B1E3F" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'geo') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={ov.geo} layout="vertical">
          <CartesianGrid stroke="#E2E8F0" />
          <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="region" width={90} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'llm-exposure' && llm) {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={llm.exposure} barGap={6}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="model" tick={{ fontSize: 11 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Drive 1 elicitation" fill="#00338D" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Drive 2 reconstruction" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'llm-high' && llm) {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={llm.highRisk}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="model" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="high" name="High-risk leaks" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (kind === 'llm-forensic' && llm) {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={llm.forensic}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="model" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="similarity" name="Avg similarity" fill="#00338D" radius={[6, 6, 0, 0]} />
          <Bar dataKey="highSimilarity" name="Cases ≥70" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
          <Bar dataKey="inconsistent" name="Inconsistent" fill="#D4A017" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return null;
}

function toCsv(preview: ReportPayload) {
  const kpis = preview.overview?.kpis ?? {};
  return 'metric,value\n' + Object.entries(kpis).map(([k, v]) => `${k},${v}`).join('\n');
}
