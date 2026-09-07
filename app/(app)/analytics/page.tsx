'use client';

import { useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Drawer, SyntheticBanner } from '@/components/shared/Overlay';
import { AIRecommendationCard } from '@/components/shared/Domain';
import { KPICard } from '@/components/shared/Card';
import type { FinancialEstimate } from '@/lib/types';

export default function AnalyticsPage() {
  const { data, loading } = useApi<{
    overview: { kpis: Record<string, number>; trend: { week: string; exposure: number }[] };
    forecast: { statement: string; confidence: string; methodologyVersion: string };
    financial: FinancialEstimate[];
    ai: { matchModel: string; matchVersion: string; promptVersion: string };
  }>('analytics');
  const [fin, setFin] = useState<FinancialEstimate | null>(null);
  if (loading || !data) return <PageLoader />;
  const f = data.financial[0];
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Risk & Predictive Analytics</h1>
          <p className="text-sm text-[#6B7280]">Deterministic synthetic AI outputs. Predictions are not presented as facts.</p>
        </div>
        <SyntheticBanner />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Closed-loop recovery (KPI)" value={`${data.overview.kpis.closedLoopRecoveryRate}%`} unit="linked reappearances / detected" statusColor="#00A36C" />
        <KPICard title="Reappearance rate (KRI)" value={`${data.overview.kpis.reappearanceRate}%`} unit="16 of 143 monitored" statusColor="#8B1E3F" />
        <KPICard title="Estimated exposure" value={`₹${data.overview.kpis.estimatedExposureCr} Cr`} unit="4.2 lakh copies × ₹443" statusColor="#8B1E3F" />
        <KPICard title="Takedown success (KPI)" value={`${data.overview.kpis.takedownRate}%`} unit="138 / 156 notices" statusColor="#00A36C" />
      </div>
      <p className="text-[11px] text-[#6B7280]">W12 exposure index 118 vs W11 100 = +18% exam-season KRI. Forecast is a scenario, not a fact.</p>
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
    </div>
  );
}
