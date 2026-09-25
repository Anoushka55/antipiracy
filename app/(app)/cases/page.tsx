'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Badge, PlatformBadge, RiskBadge, SlaBadge } from '@/components/shared/Badge';
import { CASE_STATUS_LABEL } from '@/lib/constants';
import { caseFilterQuery, describeCaseFilter, hasCaseFilter, parseCaseFilter } from '@/lib/case-filters';
import type { CaseRecord } from '@/lib/types';

export default function CasesPage() {
  const [view, setView] = useState<'table' | 'kanban' | 'timeline'>('table');
  const [q, setQ] = useState('');
  // Filters arrive in the URL from KPI drill-down shortcuts, e.g. /cases?active=1&risk=critical,high.
  const filter = parseCaseFilter(new URLSearchParams(useSearchParams().toString()));
  const filtered = hasCaseFilter(filter);
  const { data } = useApi<{ items: CaseRecord[]; total: number }>(`cases?${caseFilterQuery({ ...filter, q: q || filter.q })}`);
  // Keep the last result on screen while a new search loads, so typing doesn't flash the loader.
  if (!data) return <PageLoader />;
  const statuses = Array.from(new Set(data.items.map((c) => c.status)));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Case Registry</h1>
          <p className="text-sm text-[#6B7280]">{data.total} tenant cases · SCHAND</p>
        </div>
        <div className="flex gap-2">
          {(['table', 'kanban', 'timeline'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${view === v ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0]'}`}>{v}</button>
          ))}
        </div>
      </div>
      {filtered && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#00338D]/15 bg-[#00338D]/5 px-4 py-2.5 text-sm">
          <span className="font-semibold text-[#00338D]">{describeCaseFilter(filter)}</span>
          <span className="text-[#6B7280]">{data.items.length} {data.items.length === 1 ? 'case' : 'cases'}</span>
          <Link href="/cases" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#00338D] hover:underline">
            <X size={13} /> Clear filters
          </Link>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ID, title, platform…" className="w-full max-w-md px-3 py-2 text-sm rounded-lg border border-[#E2E8F0]" />
      {view === 'table' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
              <tr>{['Case ID', 'Title', 'Platform', 'Risk', 'Priority', 'Owner', 'Status', 'Notice Route', 'Days', 'SLA', 'Reapp.', 'Last Action'].map((h) => <th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-b border-[#E2E8F0] hover:bg-[#F4F6F9]">
                  <td className="px-3 py-3 font-mono font-semibold"><Link className="text-[#00338D]" href={`/cases/${c.id}`}>{c.id}</Link></td>
                  <td className="px-3 py-3">{c.title}</td>
                  <td className="px-3 py-3"><PlatformBadge platform={c.platform} /></td>
                  <td className="px-3 py-3"><RiskBadge risk={c.risk} /></td>
                  <td className="px-3 py-3"><RiskBadge risk={c.priority} /></td>
                  <td className="px-3 py-3">{c.ownerId}</td>
                  <td className="px-3 py-3"><Badge color="navy">{CASE_STATUS_LABEL[c.status]}</Badge></td>
                  <td className="px-3 py-3">{c.noticeRoute ?? '—'}</td>
                  <td className="px-3 py-3 font-mono">{c.daysOpen}</td>
                  <td className="px-3 py-3"><SlaBadge state={c.slaState} /></td>
                  <td className="px-3 py-3">{c.reappearance ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-3 text-[#6B7280] max-w-[200px] truncate">{c.lastAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statuses.map((s) => (
            <div key={s} className="w-64 flex-shrink-0 bg-white rounded-2xl border border-[#E2E8F0] p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">{CASE_STATUS_LABEL[s]}</div>
              <div className="space-y-2">
                {data.items.filter((c) => c.status === s).slice(0, 8).map((c) => (
                  <Link key={c.id} href={`/cases/${c.id}`} className="block rounded-xl border border-[#E2E8F0] p-3 hover:-translate-y-0.5 transition-all">
                    <div className="font-mono text-[11px] text-[#00338D]">{c.id}</div>
                    <div className="text-xs font-semibold">{c.title}</div>
                    <RiskBadge risk={c.risk} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {view === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
          {data.items.slice(0, 20).map((c) => (
            <div key={c.id} className="flex gap-4 text-xs border-b border-[#E2E8F0] pb-3">
              <div className="font-mono text-[#9CA3AF] w-36">{c.createdAt.slice(0, 10)}</div>
              <Link href={`/cases/${c.id}`} className="font-semibold text-[#00338D]">{c.id}</Link>
              <div>{c.title}</div>
              <Badge>{CASE_STATUS_LABEL[c.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
