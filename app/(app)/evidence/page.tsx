'use client';

import { useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Timeline } from '@/components/shared/Domain';
import { useState } from 'react';
import type { Evidence, EvidenceCustodyEvent } from '@/lib/types';

export default function EvidencePage() {
  const params = useSearchParams();
  const highlight = params.get('id');
  const { data, loading, refresh } = useApi<{ items: Evidence[] }>('evidence');
  const [open, setOpen] = useState<string | null>(highlight);
  const detail = useApi<{ evidence: Evidence; custody: EvidenceCustodyEvent[] }>(open ? `evidence-item?id=${open}` : null);
  const [msg, setMsg] = useState('');

  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Evidence Vault</h1>
      <p className="text-sm text-[#6B7280]">Forensic preservation workflow aligned to the prototype&apos;s evidence governance model.</p>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
              <tr>{['Evidence ID', 'Case', 'Type', 'Captured UTC', 'SHA-256', 'Integrity', 'Custody'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id} className="border-b border-[#E2E8F0] cursor-pointer hover:bg-[#F4F6F9]" onClick={() => setOpen(e.id)}>
                  <td className="px-3 py-3 font-mono font-semibold text-[#00338D]">{e.id}</td>
                  <td className="px-3 py-3">{e.caseId}</td>
                  <td className="px-3 py-3">{e.type}</td>
                  <td className="px-3 py-3">{e.capturedAt}</td>
                  <td className="px-3 py-3 font-mono text-[10px] max-w-[160px] truncate">{e.sha256}</td>
                  <td className="px-3 py-3"><Badge color="green">{e.integrity}</Badge></td>
                  <td className="px-3 py-3">{e.chainOfCustodyStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6">
          {!open && <p className="text-xs text-[#6B7280]">Select an evidence object.</p>}
          {open && detail.data && (
            <div className="space-y-3 text-xs">
              <div className="font-mono font-bold text-sm">{detail.data.evidence.id}</div>
              <div>Storage {detail.data.evidence.storageLocation}</div>
              <div>Tool {detail.data.evidence.toolVersion}</div>
              <Badge color="green">Evidence Integrity VERIFIED</Badge>
              <Badge color="navy">Chain of Custody INTACT</Badge>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setMsg('Preview available in prototype metadata view')}>Preview</Button>
                <Button size="sm" variant="outline" onClick={() => setMsg('Demo download is metadata-only')}>Download</Button>
                <Button size="sm" onClick={async () => { const r = await post<{ ok: boolean }>('evidence/verify', { evidenceId: open }); setMsg(r.ok ? 'HASH VERIFIED' : 'Mismatch'); await refresh(); }}>Verify Hash</Button>
              </div>
              {msg && <div className="text-[#00A36C] font-semibold">{msg}</div>}
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mt-4">Custody history</div>
              <Timeline items={(detail.data.custody ?? []).map((c) => ({ title: c.event.replace('_', ' '), meta: c.timestamp, detail: c.detail }))} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
