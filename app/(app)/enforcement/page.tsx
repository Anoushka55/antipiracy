'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge, SlaBadge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Toast } from '@/components/shared/Overlay';
import type { CaseRecord, Submission } from '@/lib/types';

export default function EnforcementPage() {
  const { data, loading, refresh } = useApi<{ items: (CaseRecord & { submission?: Submission; notice?: { id: string; status: string } })[] }>('enforcement');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(id: string) {
    setBusy(id);
    try {
      const r = await post<{ ticketId: string; destination: string }>('enforcement/submit', { caseId: id });
      setToast(`Notice submitted successfully · ${r.ticketId} · ${r.destination} · SIMULATED SUBMISSION`);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Enforcement Queue</h1>
      <p className="text-sm text-[#6B7280]">Dispatcher for simulated platform submissions. Nothing is sent externally.</p>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>{['Case', 'Platform', 'Notice Type', 'Submitted', 'Ticket ID', 'Status', 'SLA', 'Next Action'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id} className="border-b border-[#E2E8F0]">
                <td className="px-3 py-3 font-mono"><Link className="text-[#00338D] font-semibold" href={`/cases/${c.id}`}>{c.id}</Link></td>
                <td className="px-3 py-3">{c.platform}</td>
                <td className="px-3 py-3">{c.noticeRoute}</td>
                <td className="px-3 py-3">{c.submission?.submittedAt?.slice(0, 16) ?? '—'}</td>
                <td className="px-3 py-3 font-mono">{c.submission?.ticketId ?? '—'}</td>
                <td className="px-3 py-3"><Badge>{c.status}</Badge></td>
                <td className="px-3 py-3"><SlaBadge state={c.slaState} /></td>
                <td className="px-3 py-3">
                  {c.status === 'notice_ready' || (c.notice?.status === 'approved' && !c.submission) ? (
                    <Button size="sm" disabled={busy === c.id} onClick={() => submit(c.id)}>Submit Notice</Button>
                  ) : c.status === 'awaiting_response' ? (
                    <Button size="sm" variant="outline" onClick={async () => { await post('enforcement/response', { caseId: c.id }); await refresh(); setToast('SIMULATED RESPONSE — Removed'); }}>Simulate Response</Button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
