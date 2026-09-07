'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Badge, RiskBadge } from '@/components/shared/Badge';
import type { Finding, Investigation } from '@/lib/types';

export default function InvestigationsPage() {
  const params = useSearchParams();
  const highlight = params.get('finding');
  const { data, loading } = useApi<{ items: (Investigation & { finding?: Finding; case?: { id: string; status: string } })[] }>('investigations');
  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Investigation Workspace</h1>
      <p className="text-sm text-[#6B7280]">Investigator queue — evidence, similarity and promotion controls live on the case record.</p>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>
              {['Investigation', 'Finding', 'Title', 'Status', 'Case', 'Updated'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.items.map((inv) => (
              <tr key={inv.id} className={`border-b border-[#E2E8F0] ${highlight === inv.findingId ? 'bg-[#c83328]/5' : ''}`}>
                <td className="px-3 py-3 font-mono">{inv.id}</td>
                <td className="px-3 py-3">{inv.findingId}</td>
                <td className="px-3 py-3">{inv.finding?.suspectedTitle}</td>
                <td className="px-3 py-3"><Badge>{inv.status}</Badge></td>
                <td className="px-3 py-3">{inv.case ? <Link className="text-[#c83328] font-semibold" href={`/cases/${inv.case.id}`}>{inv.case.id}</Link> : '—'}</td>
                <td className="px-3 py-3 text-[#6B7280]">{inv.updatedAt.slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
