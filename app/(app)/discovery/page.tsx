'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge, PlatformBadge, RiskBadge } from '@/components/shared/Badge';
import { Drawer, Modal, Toast } from '@/components/shared/Overlay';
import { AIRecommendationCard } from '@/components/shared/Domain';
import { PageLoader } from '@/components/shared/LoadingDots';
import { DiscoveryScanPanel } from '@/components/shared/DiscoveryScanPanel';
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
  const [scanLabel, setScanLabel] = useState('Discovery Run');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const playbackDone = useRef<() => void>(() => {});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { data, loading, refresh } = useApi<{ items: Finding[]; total: number; newCount: number }>(`findings?tab=${tab}`);

  // New rows keep their highlight for a few seconds after a scan or upload.
  useEffect(() => {
    if (!highlight.size) return;
    const t = setTimeout(() => setHighlight(new Set()), 4000);
    return () => clearTimeout(t);
  }, [highlight]);

  const newIds = (result: Record<string, unknown>) => new Set(Array.isArray(result.newFindingIds) ? (result.newFindingIds as string[]) : []);

  async function runScan() {
    setBusy(true);
    setScan(null);
    setScanning(true);
    // Results show once both the scan playback and the API call have finished.
    const playback = new Promise<void>((resolve) => { playbackDone.current = resolve; });
    try {
      const [r] = await Promise.all([post<{ result: Record<string, unknown> }>('discovery/run'), playback]);
      await refresh();
      setScan(r.result);
      setScanLabel('Discovery Run');
      setHighlight(newIds(r.result));
      setToast('Discovery completed');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  async function uploadDataset() {
    if (!uploadFile) return;
    setBusy(true);
    try {
      const content = await uploadFile.text();
      const r = await post<{ result: Record<string, unknown> }>('discovery/upload', { filename: uploadFile.name, content });
      setScan(r.result);
      setScanLabel('Dataset Upload Complete');
      setHighlight(newIds(r.result));
      setToast(`Workspace replaced: ${String(r.result.titles)} titles, ${String(r.result.cases)} cases, ${String(r.result.newFindings)} findings`);
      setUploadOpen(false);
      setUploadFile(null);
      setTab('all');
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Upload failed');
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} disabled={busy}><Upload size={14} />Upload Dataset</Button>
          <Button onClick={runScan} disabled={busy}>{busy ? 'Scanning…' : 'Run Discovery Scan'}</Button>
        </div>
      </div>
      {scanning && <DiscoveryScanPanel onComplete={() => playbackDone.current()} />}
      {!scanning && scan && (
        <div className="rounded-2xl border border-[#0077C8]/20 bg-[#0077C8]/5 p-4 text-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#0077C8] mb-1">{scanLabel}</div>
          Sources scanned: {String(scan.sourcesScanned)} · New findings: {String(scan.newFindings)} · Duplicates removed: {String(scan.duplicatesRemoved)} · High-confidence: {String(scan.highConfidence)} · Critical: {String(scan.critical)}
        </div>
      )}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.id ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0] text-[#6B7280]'}`}
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
                <tr key={f.id} className={`border-b border-[#E2E8F0] hover:bg-[#F4F6F9] cursor-pointer transition-colors duration-1000 ${highlight.has(f.id) ? 'bg-[#0077C8]/10' : ''}`} onClick={() => setSelected(f.id)}>
                  <td className="px-3 py-3 font-mono font-semibold text-[#00338D]">{f.id}</td>
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
      {uploadOpen && (
        <Modal title="Upload Dataset" onClose={() => { setUploadOpen(false); setUploadFile(null); }}>
          <div className="space-y-4">
            <p className="text-xs text-[#6B7280]">
              Upload a catalogue CSV to replace the entire workspace — catalogue, cases, findings, evidence, notices and monitoring — with data generated from this dataset. <b className="text-[#1A1F36]">Nothing from the current dataset is kept.</b>
            </p>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Dataset file (.csv)</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1A1F36] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-[#00338D]/10 file:text-[#00338D] file:text-xs file:font-semibold"
              />
              {uploadFile && (
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">Selected: {uploadFile.name} ({Math.round(uploadFile.size / 1024)} KB)</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setUploadOpen(false); setUploadFile(null); }} disabled={busy}>Cancel</Button>
              <Button size="sm" onClick={uploadDataset} disabled={!uploadFile || busy}>{busy ? 'Uploading…' : 'Replace Workspace'}</Button>
            </div>
          </div>
        </Modal>
      )}
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
          <div className="text-xs break-all text-[#0077C8]">{data.finding.url}</div>
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
      <div className="text-[#1A1F36] font-medium">{v}</div>
    </div>
  );
}
