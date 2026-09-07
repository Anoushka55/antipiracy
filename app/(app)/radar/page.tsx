'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge, RiskBadge } from '@/components/shared/Badge';
import { KPICard } from '@/components/shared/Card';
import { PageLoader, LoadingDots } from '@/components/shared/LoadingDots';
import { ClosedLoopDiagram } from '@/components/shared/Domain';
import { Toast } from '@/components/shared/Overlay';
import type { EntityRecord, Reappearance } from '@/lib/types';

const STEPS = [
  'Scanning monitored sources...',
  'Checking content fingerprints...',
  'Comparing protected assets...',
  'Checking known entities...',
  'Analyzing relationships...',
  'Potential reappearance detected.',
];

export default function RadarPage() {
  const { data, loading, refresh } = useApi<{
    kpis: Record<string, number>;
    items: Reappearance[];
    entities: EntityRecord[];
    cases: { id: string; title: string; status: string }[];
  }>('radar');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [toast, setToast] = useState('');
  const [wow, setWow] = useState<null | { finding: { id: string; url: string }; reappearance: Reappearance }>(null);

  async function simulate() {
    setBusy(true);
    setWow(null);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 450));
    }
    try {
      const r = await post<{ finding: { id: string; url: string }; reappearance: Reappearance }>('radar/simulate', { caseId: 'SC-2026-0842' });
      setWow(r);
      setToast('REAPPEARANCE DETECTED · 97% CONFIDENCE');
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
      setStep(-1);
    }
  }

  if (loading || !data) return <PageLoader />;
  const k = data.kpis;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reappearance Radar</h1>
          <p className="text-sm text-[#6B7280]">We don&apos;t just take piracy down. We learn from every enforcement action and continuously look for its return.</p>
        </div>
        <Button onClick={simulate} disabled={busy}>Simulate Reappearance</Button>
      </div>

      {busy && (
        <div className="rounded-2xl border border-[#c83328]/20 bg-[#c83328]/5 p-5 flex items-center gap-3">
          <LoadingDots />
          <div className="text-sm font-semibold">{STEPS[Math.max(0, step)]}</div>
        </div>
      )}

      {wow && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-6 space-y-3">
          <div className="text-sm font-bold text-[#DC2626]">REAPPEARANCE DETECTED · 97% CONFIDENCE</div>
          <p className="text-sm">Previously removed content associated with SC-2026-0842 has been detected at a new location.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>Original Case <b>SC-2026-0842</b></div>
            <div>New Finding <b>{wow.finding.id}</b></div>
            <div>Risk <b>CRITICAL</b></div>
            <div>Action <b>REVIEW & REOPEN</b></div>
          </div>
          <RelationshipGraph />
          <div className="flex gap-2">
            <Link href={`/cases/SC-2026-0842`}><Button size="sm">Open original case</Button></Link>
            <Link href={`/discovery?id=${wow.finding.id}`}><Button size="sm" variant="outline">Open new finding</Button></Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Active monitoring" value={k.monitored} statusColor="#00A36C" />
        <KPICard title="Reappearances detected" value={k.reappearances} statusColor="#DC2626" />
        <KPICard title="Repeat offenders" value={k.repeatOffenders} statusColor="#c83328" />
        <KPICard title="Closed-loop recovery" value={`${k.closedLoop}%`} statusColor="#c83328" />
        <KPICard title="Avg. time to reappearance" value={`${k.avgTime}d`} />
        <KPICard title="Reappearance rate" value={`${k.rate}%`} />
        <KPICard title="Total monitored" value={k.totalMonitored} />
        <KPICard title="Detect latency" value="1.8d" unit="synthetic" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-xs font-semibold mb-3">Reappearance trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={Array.from({ length: 8 }, (_, i) => ({ w: `W${i + 1}`, n: 2 + (i % 4) }))}>
              <CartesianGrid stroke="#E2E8F0" />
              <XAxis dataKey="w" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line dataKey="n" stroke="#c83328" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-xs font-semibold mb-3">Entity recurrence</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.entities.slice(0, 6).map((e) => ({ name: e.name.slice(0, 12), n: e.reappearances }))}>
              <CartesianGrid stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="n" fill="#c83328" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>{['Original Case', 'New Finding', 'Platform', 'Uploader', 'Similarity', 'Relationship', 'Risk'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-b border-[#E2E8F0]">
                <td className="px-3 py-3 font-mono"><Link className="text-[#c83328]" href={`/cases/${r.originalCaseId}`}>{r.originalCaseId}</Link></td>
                <td className="px-3 py-3 font-mono">{r.newFindingId}</td>
                <td className="px-3 py-3">{r.platform}</td>
                <td className="px-3 py-3">{r.uploader}</td>
                <td className="px-3 py-3 font-mono">{r.similarity}%</td>
                <td className="px-3 py-3"><Badge color="red">{r.relationship}</Badge></td>
                <td className="px-3 py-3"><RiskBadge risk="critical" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ClosedLoopDiagram />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function RelationshipGraph() {
  return (
    <div className="font-mono text-[11px] leading-6 text-center bg-white rounded-xl border border-[#E2E8F0] p-4">
      <div>ORIGINAL CASE · SC-2026-0842</div>
      <div className="text-[#9CA3AF]">│ Removed</div>
      <div>Telegram Channel · AcademicLeaks_IN</div>
      <div className="text-[#9CA3AF]">│ 4 days later</div>
      <div className="text-[#DC2626] font-bold">REAPPEARANCE DETECTED</div>
      <div>File Host · StudyVault_Admin</div>
      <div>97% MATCH</div>
      <div>LINKED FINDING · FND-2026-1148</div>
      <div className="text-[#6B7280] mt-2">ONE INCIDENT → MULTIPLE DISTRIBUTION LOCATIONS</div>
    </div>
  );
}
