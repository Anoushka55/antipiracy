'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Badge, PlatformBadge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Toast } from '@/components/shared/Overlay';
import { NoticeDocumentLoader, NoticeTemplatePicker } from '@/components/shared/NoticeDocumentView';
import { TEMPLATE_FOR_ROUTE, TEMPLATE_LABEL } from '@/lib/notice-templates';
import type { NoticeRoute } from '@/lib/types';

interface NoticeItem {
  id: string;
  caseId: string;
  title: string;
  platform: string;
  uploader: string;
  caseStatus: string;
  route: NoticeRoute;
  status: 'draft' | 'approved' | 'dispatched';
  generatedAt: string;
  approvedAt: string | null;
}

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'approved', label: 'Approved' },
  { id: 'dispatched', label: 'Dispatched' },
] as const;

const STATUS_COLOR = { draft: 'amber', approved: 'blue', dispatched: 'green' } as const;

export default function NoticesPage() {
  const params = useSearchParams();
  const { data, loading, refresh } = useApi<{ items: NoticeItem[] }>('notices');
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['id']>('all');
  const [template, setTemplate] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter(
      (n) => (status === 'all' || n.status === status) && (template === 'all' || TEMPLATE_FOR_ROUTE[n.route] === template)
    );
  }, [data, status, template]);

  // Open the first notice in view when nothing (or a filtered-out notice) is selected.
  useEffect(() => {
    if (!rows.length) return;
    if (!selectedId || !(data?.items ?? []).some((n) => n.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId, data]);

  const selected = data?.items.find((n) => n.id === selectedId) ?? null;

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      setToast(ok);
      await refresh();
      setVersion((v) => v + 1);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) return <PageLoader />;
  const count = (s: string) => (s === 'all' ? data.items.length : data.items.filter((n) => n.status === s).length);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1F36]">Notices</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Every takedown notice, drafted from S. Chand&apos;s notice templates: Copyright Reporting, US Copyright – DMCA, Intermediary Notice and Escalated Legal Notice.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === t.id ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0] text-[#6B7280]'}`}
          >
            {t.label} <span className="opacity-70">({count(t.id)})</span>
          </button>
        ))}
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="ml-auto text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[#1A1F36]"
        >
          <option value="all">All templates</option>
          {Object.entries(TEMPLATE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
          {rows.length === 0 && <p className="px-4 py-8 text-center text-xs text-[#9CA3AF]">No notices match these filters.</p>}
          {rows.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-[#E2E8F0] transition-colors ${n.id === selectedId ? 'bg-[#00338D]/[0.05] border-l-[3px] border-l-[#00338D]' : 'hover:bg-[#F4F6F9]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-[#00338D]">{n.id} · {n.caseId}</span>
                <Badge color={STATUS_COLOR[n.status]}>{n.status}</Badge>
              </div>
              <div className="text-sm font-semibold text-[#1A1F36] mt-1 truncate">{n.title}</div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B7280]">
                <PlatformBadge platform={n.platform} />
                <span className="truncate">{TEMPLATE_LABEL[TEMPLATE_FOR_ROUTE[n.route]]}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3 min-w-0">
          {selected ? (
            <>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 flex flex-wrap items-center gap-3">
                <FileText size={16} className="text-[#00338D]" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#1A1F36] truncate">{selected.title}</div>
                  <div className="text-[11px] text-[#6B7280]">{selected.caseId} · {selected.platform} · {selected.uploader}</div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <NoticeTemplatePicker
                    route={selected.route}
                    disabled={busy || selected.status !== 'draft'}
                    onChange={(route) => act(() => post('cases/notice', { caseId: selected.caseId, route }), 'Draft rewritten from the selected template')}
                  />
                  {selected.status === 'draft' && (
                    <Button size="sm" disabled={busy} onClick={() => act(() => post('notices/approve', { noticeId: selected.id }), 'Notice approved and signed')}>
                      Approve notice
                    </Button>
                  )}
                  <Link href={`/cases/${selected.caseId}?tab=notice`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#00338D] hover:underline">
                    Open case <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
              <NoticeDocumentLoader noticeId={selected.id} version={`${version}-${selected.route}-${selected.status}`} />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] px-6 py-12 text-center text-sm text-[#9CA3AF]">Select a notice to read it.</div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
