'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge, PlatformBadge, RiskBadge } from '@/components/shared/Badge';
import { Drawer, Toast } from '@/components/shared/Overlay';
import { AIRecommendationCard } from '@/components/shared/Domain';
import { PageLoader } from '@/components/shared/LoadingDots';
import type { Finding } from '@/lib/types';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'ai_flagged', label: 'AI Flagged' },
  { id: 'priority', label: 'Priority Titles' },
  { id: 'needs_validation', label: 'Needs Validation' },
  { id: 'promoted', label: 'Promoted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function DiscoveryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(params.get('tab') ?? 'all');
  const [selected, setSelected] = useState<string | null>(params.get('id'));
  const [toast, setToast] = useState('');
  const [scan, setScan] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, refresh } = useApi<{ items: Finding[]; total: number; newCount: number }>(`findings?tab=${tab}`);

  async function runScan() {
    setBusy(true);
    try {
      const r = await post<{ result: Record<string, unknown> }>('discovery/run');
      setScan(r.result);
      setToast('SIMULATED DISCOVERY RUN complete');
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discovery Inbox</h1>
          <p className="text-sm text-[#6B7280]">{data?.newCount ?? 0} new findings · OSINT intake for S. Chand catalogue</p>
        </div>
        <Button onClick={runScan} disabled={busy}>{busy ? 'Scanning…' : 'Run Discovery Scan'}</Button>
      </div>
      {scan && (
        <div className="rounded-2xl border border-[#c83328]/20 bg-[#c83328]/5 p-4 text-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#c83328] mb-1">Simulated Discovery Run</div>
          Sources scanned: {String(scan.sourcesScanned)} · New findings: {String(scan.newFindings)} · Duplicates removed: {String(scan.duplicatesRemoved)} · High-confidence: {String(scan.highConfidence)} · Critical: {String(scan.critical)}
        </div>
      )}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.id ? 'bg-[#c83328] text-white' : 'bg-white border border-[#E2E8F0] text-[#6B7280]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
              <tr>
                {['Finding ID', 'Detected', 'Platform', 'URL', 'Suspected Title', 'Uploader', 'Match', 'AI', 'Priority', 'Risk', 'Status', 'Investigator', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((f) => (
                <tr key={f.id} className="border-b border-[#E2E8F0] hover:bg-[#F4F6F9] cursor-pointer" onClick={() => setSelected(f.id)}>
                  <td className="px-3 py-3 font-mono font-semibold text-[#c83328]">{f.id}</td>
                  <td className="px-3 py-3 text-[#6B7280] whitespace-nowrap">{f.detectedAt.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-3 py-3"><PlatformBadge platform={f.platform} /></td>
                  <td className="px-3 py-3 max-w-[180px] truncate text-[#6B7280]">{f.url}</td>
                  <td className="px-3 py-3 font-medium">{f.suspectedTitle}</td>
                  <td className="px-3 py-3">{f.uploader}</td>
                  <td className="px-3 py-3 font-mono">{f.matchScore}%</td>
                  <td className="px-3 py-3 font-mono">{f.aiConfidence}%</td>
                  <td className="px-3 py-3"><RiskBadge risk={f.priority} /></td>
                  <td className="px-3 py-3"><RiskBadge risk={f.risk} /></td>
                  <td className="px-3 py-3"><Badge color="grey">{f.status.replace('_', ' ')}</Badge></td>
                  <td className="px-3 py-3 text-[#6B7280]">{f.assignedInvestigatorId}</td>
                  <td className="px-3 py-3"><Button size="sm" variant="ghost">Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <FindingDrawer
          id={selected}
          onClose={() => setSelected(null)}
          onDone={async (msg, href) => {
            setToast(msg);
            await refresh();
            if (href) router.push(href);
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function FindingDrawer({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: (msg: string, href?: string) => void }) {
  const { data, loading } = useApi<{
    finding: Finding;
    asset?: { title: string; isbn: string; priorityTitle: boolean };
    ai: { recommendation: string; confidence: number; model: string; version: string; promptVersion: string; timestamp: string; methodology: string; inputs: Record<string, unknown> };
    similarity: { overall: number; text: number; visual: number; metadata: number; watermark: boolean };
    related: Finding[];
    entity?: { name: string; riskScore: number };
  }>(`finding?id=${id}`);
  const [busy, setBusy] = useState('');

  const actions = useMemo(() => [
    { id: 'validate', label: 'Validate Finding', run: () => post('findings/validate', { findingId: id, decision: 'validated' }), msg: 'Finding validated' },
    { id: 'reject', label: 'Reject', run: () => post('findings/validate', { findingId: id, decision: 'rejected' }), msg: 'Finding rejected' },
    { id: 'promote', label: 'Promote to Case', run: () => post<{ id: string }>('findings/promote', { findingId: id }), msg: 'Case created', href: true },
  ], [id]);

  return (
    <Drawer title={id} onClose={onClose} width="w-[560px]">
      {loading || !data ? <PageLoader /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field k="Platform" v={data.finding.platform} />
            <Field k="Uploader" v={data.finding.uploader} />
            <Field k="Detected" v={data.finding.detectedAt} />
            <Field k="Host" v={data.finding.hostingCountry} />
            <Field k="Match score" v={`${data.finding.matchScore}%`} />
            <Field k="Watermark" v={data.finding.watermarkDetected ? 'Detected' : 'Not detected'} />
          </div>
          <div className="text-xs break-all text-[#c83328]">{data.finding.url}</div>
          {data.asset && <div className="text-xs">Suspected asset: <b>{data.asset.title}</b> · ISBN {data.asset.isbn} {data.asset.priorityTitle && <Badge color="red">Priority title</Badge>}</div>}
          <AIRecommendationCard {...data.ai} />
          <div className="rounded-xl border border-[#E2E8F0] p-3 text-xs space-y-1">
            <div>Text similarity {data.similarity.text}% · Visual {data.similarity.visual}% · Metadata {data.similarity.metadata}%</div>
            <div className="font-mono font-bold text-lg">{data.similarity.overall}% Match</div>
          </div>
          {data.entity && <div className="text-xs">Entity {data.entity.name} · risk {data.entity.riskScore}/100</div>}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a.id} size="sm" variant={a.id === 'reject' ? 'danger' : a.id === 'promote' ? 'primary' : 'outline'} disabled={!!busy} onClick={async () => {
                setBusy(a.id);
                try {
                  const r = await a.run();
                  const href = a.href && r && typeof r === 'object' && 'id' in r ? `/cases/${(r as { id: string }).id}` : undefined;
                  onDone(a.msg, href);
                  onClose();
                } catch (e) {
                  onDone(e instanceof Error ? e.message : 'Failed');
                } finally {
                  setBusy('');
                }
              }}>{a.label}</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => { onClose(); window.location.href = `/investigations?finding=${id}`; }}>Create Investigation</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{k}</div>
      <div className="text-[#111111] font-medium">{v}</div>
    </div>
  );
}
