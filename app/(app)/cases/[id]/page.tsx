'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge, PlatformBadge, RiskBadge, SlaBadge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Drawer, Toast } from '@/components/shared/Overlay';
import { AIRecommendationCard, ClosedLoopDiagram, DecisionGates, Timeline } from '@/components/shared/Domain';
import { CASE_STATUS_LABEL, NOTICE_ROUTE_LABEL } from '@/lib/constants';
import { slaProgressLabel } from '@/lib/sla';
import type { CaseRecord, Evidence, Finding, LegalReview, Notice, Reappearance, RightsValidation } from '@/lib/types';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, refresh } = useApi<CasePayload>(`case?id=${id}`);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(path: string, body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      await post(path, body);
      setToast(ok);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) return <PageLoader />;
  const c = data.case;
  const monitoring = data.monitoring;
  const rights = data.rights[0];
  const notice = data.notices[0];

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Master case</div>
          <h1 className="text-2xl font-bold font-mono">{c.id}</h1>
          <p className="text-sm text-[#6B7280]">{c.title} · {c.uploader} · {c.platform}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge color="navy">{CASE_STATUS_LABEL[c.status]}</Badge>
          <RiskBadge risk={c.risk} />
          <SlaBadge state={c.slaState} label={slaProgressLabel(c.createdAt, c.slaHours)} />
        </div>
      </div>

      {(c.status === 'removed' || c.status === 'monitoring') && monitoring && (
        <div className="rounded-2xl border border-[#00A36C]/30 bg-[#F0FDF4] p-5">
          <div className="text-sm font-bold text-[#00A36C]">CONTENT REMOVED</div>
          <p className="text-sm text-[#1A1F36] mt-1">Enforcement successful.</p>
          <p className="text-sm text-[#6B7280]">Monitoring remains active for {monitoring.windowDays} days. Next automated check: {monitoring.nextScanAt.slice(0, 16).replace('T', ' ')} UTC</p>
          <div className="flex gap-4 mt-3 text-xs">
            <span>Status: <b>ACTIVE</b></span>
            <span>Window: <b>{monitoring.windowDays} DAYS</b></span>
            <span>Cadence: <b>{monitoring.cadence.toUpperCase()}</b></span>
          </div>
        </div>
      )}

      {data.reappearances[0] && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-5">
          <div className="text-sm font-bold text-[#DC2626]">REAPPEARANCE DETECTED</div>
          <p className="text-sm mt-1">Previously removed content associated with {c.id} has been detected at a new location.</p>
          <p className="text-xs text-[#6B7280] mt-1">New finding {data.reappearances[0].newFindingId} · {Math.round(data.reappearances[0].confidence * 100)}% confidence · RELATED TO PREVIOUS CASE</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => router.push(`/discovery?id=${data.reappearances[0].newFindingId}`)}>Review Evidence</Button>
            <Button size="sm" variant="outline" onClick={() => setTab('compare')}>Compare With Original</Button>
            <Button size="sm" variant="accent" disabled={busy} onClick={() => act('radar/confirm', { reappearanceId: data.reappearances[0].id }, 'Relationship confirmed')}>Confirm relationship</Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => act('cases/reopen', { caseId: c.id, findingId: data.reappearances[0].newFindingId }, 'CASE REOPENED')}>Reopen Case</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2 text-xs">
            <Row k="Source URL" v={c.url} />
            <Row k="Platform" v={c.platform} />
            <Row k="Uploader" v={c.uploader} />
            <Row k="Discovered" v={data.finding?.detectedAt ?? c.createdAt} />
            <Row k="Owner" v={data.owner?.name ?? c.ownerId} />
            <Row k="Hosting" v={c.hostingCountry} />
            <Row k="Notice route" v={c.noticeRoute ? NOTICE_ROUTE_LABEL[c.noticeRoute] : '—'} />
            <Row k="Parent case" v={c.parentCaseId ?? '—'} />
          </div>
          {data.ai && <AIRecommendationCard {...data.ai} />}
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="flex gap-1 flex-wrap">
            {['overview', 'evidence', 'similarity', 'uploader', 'related', 'history', 'legal', 'notice', 'compare'].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${tab === t ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0]'}`}>{t}</button>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            {tab === 'overview' && (
              <div className="space-y-3 text-sm">
                <p>{data.asset?.title} by {data.asset?.author}. Segment {data.asset?.segment}. ISBN {data.asset?.isbn}.</p>
                <p className="text-[#6B7280]">{data.ai?.recommendation}</p>
                {data.asset?.priorityTitle && <Badge color="red">Priority title</Badge>}
              </div>
            )}
            {tab === 'evidence' && (
              <div className="space-y-3">
                {data.evidence.map((e) => (
                  <EvidenceRow key={e.id} e={e} onVerify={() => act('evidence/verify', { evidenceId: e.id }, 'HASH VERIFIED')} />
                ))}
                <p className="text-[11px] text-[#9CA3AF]">Forensic preservation workflow aligned to the prototype&apos;s evidence governance model. Does not claim legal admissibility.</p>
              </div>
            )}
            {tab === 'similarity' && data.finding && (
              <Similarity finding={data.finding} />
            )}
            {tab === 'uploader' && (
              <div className="text-sm space-y-2">
                <div className="font-semibold">{c.uploader}</div>
                <div>Entity {data.entity?.name} · Repeat offender score {data.entity?.riskScore}/100</div>
                <Link className="text-[#00338D] text-xs" href={`/entities/${c.entityId}`}>Open entity profile</Link>
              </div>
            )}
            {tab === 'related' && (
              <div className="text-xs space-y-2">
                {data.reappearances.map((r) => (
                  <div key={r.id} className="border border-[#E2E8F0] rounded-xl p-3">
                    <div className="font-mono">{r.newFindingId}</div>
                    <div>{r.newUrl}</div>
                    <div>Similarity {r.similarity}% · {r.relationship}</div>
                  </div>
                ))}
                {data.reappearances.length === 0 && <p>No linked reappearances.</p>}
              </div>
            )}
            {tab === 'history' && (
              <Timeline items={data.transitions.map((t) => ({ title: `${t.from ?? '—'} → ${t.to}`, meta: t.timestamp, detail: t.reason }))} />
            )}
            {tab === 'legal' && (
              <div className="space-y-4">
                {rights && <DecisionGates gates={rights.gates} />}
                {rights?.inheritedFromCaseId && (
                  <div className="text-xs rounded-xl border border-[#0077C8]/20 bg-[#0077C8]/5 p-3">
                    Rights validation inherited from {rights.inheritedFromCaseId}. Previous rights validation available — confirmation required.
                  </div>
                )}
                {data.legal && (
                  <div className="text-xs space-y-1">
                    <div>Recommended route: <b>{NOTICE_ROUTE_LABEL[data.legal.recommendedRoute]}</b> ({data.legal.routeConfidence})</div>
                    <div className="text-[#6B7280]">{data.legal.routeReason}</div>
                  </div>
                )}
              </div>
            )}
            {tab === 'notice' && (
              <NoticePanel notice={notice} route={data.route} onGenerate={() => act('cases/notice', { caseId: c.id }, 'Draft generated')} onApprove={() => notice && act('notices/approve', { noticeId: notice.id }, 'Notice approved')} onOpen={() => setNoticeOpen(true)} />
            )}
            {tab === 'compare' && data.reappearances[0] && (
              <Compare original={data.finding} rec={c} rea={data.reappearances[0]} evidence={data.evidence} />
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Investigator / Legal / Ops</div>
            <Button className="w-full" size="sm" disabled={busy} onClick={() => act('cases/confirm', { caseId: c.id, outcome: 'confirmed' }, 'Infringement confirmed')}>Confirm infringement</Button>
            <Button className="w-full" size="sm" variant="outline" disabled={busy} onClick={() => act('cases/confirm', { caseId: c.id, outcome: 'insufficient_evidence' }, 'Additional evidence requested')}>Insufficient evidence</Button>
            <Button className="w-full" size="sm" variant="ghost" disabled={busy} onClick={() => act('cases/confirm', { caseId: c.id, outcome: 'false_positive' }, 'Marked false positive')}>False positive</Button>
            <Button className="w-full" size="sm" variant="accent" disabled={busy} onClick={() => act('cases/rights', { caseId: c.id }, '4/4 VALIDATED')}>Approve Rights (4 gates)</Button>
            <Button className="w-full" size="sm" disabled={busy} onClick={() => act('cases/legal', { caseId: c.id }, 'Legal action approved')}>Approve Legal Action</Button>
            <Button className="w-full" size="sm" variant="outline" disabled={busy} onClick={() => { setTab('notice'); act('cases/notice', { caseId: c.id }, 'Draft populated'); }}>Generate Draft Notice</Button>
            <Button className="w-full" size="sm" disabled={busy || !notice} onClick={() => notice && act('notices/approve', { noticeId: notice.id }, 'Notice approved')}>Approve Notice</Button>
            <Button className="w-full" size="sm" variant="success" disabled={busy} onClick={() => act('enforcement/submit', { caseId: c.id }, 'SIMULATED SUBMISSION')}>Submit Notice</Button>
            <Button className="w-full" size="sm" variant="outline" disabled={busy} onClick={() => act('enforcement/response', { caseId: c.id, outcome: 'removed' }, 'Removed — monitoring active')}>Simulate Removal</Button>
            <Button className="w-full" size="sm" variant="amber" disabled={busy} onClick={() => act('radar/simulate', { caseId: c.id }, 'REAPPEARANCE DETECTED')}>Simulate Reappearance</Button>
            <Button className="w-full" size="sm" variant="ghost" disabled={busy} onClick={() => act('cases/close', { caseId: c.id, reason: 'Monitoring complete' }, 'Case closed')}>Close Case</Button>
          </div>
        </div>
      </div>
      <ClosedLoopDiagram />
      {noticeOpen && notice && (
        <Drawer title="Notice preview" onClose={() => setNoticeOpen(false)}>
          <pre className="text-xs whitespace-pre-wrap font-mono">{Object.entries(notice).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
        </Drawer>
      )}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{k}</div>
      <div className="break-all">{v}</div>
    </div>
  );
}

function EvidenceRow({ e, onVerify }: { e: Evidence; onVerify: () => void }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold">{e.id}</span>
        <Badge color={e.integrity === 'verified' ? 'green' : 'amber'}>{e.integrity === 'verified' ? 'Evidence Integrity VERIFIED' : e.integrity}</Badge>
      </div>
      <div className="mt-1">{e.previewLabel} · {e.type}</div>
      <div className="font-mono text-[10px] text-[#6B7280] break-all">SHA-256 {e.sha256}</div>
      <div className="text-[#6B7280]">Chain of Custody {e.chainOfCustodyStatus.toUpperCase()}</div>
      <Button size="sm" variant="outline" className="mt-2" onClick={onVerify}>Verify Hash</Button>
    </div>
  );
}

function Similarity({ finding }: { finding: Finding }) {
  return (
    <div className="space-y-2 text-sm">
      <div>Text similarity: {finding.ocrSimilarity}%</div>
      <div>Visual similarity: {Math.max(70, finding.matchScore - 4)}%</div>
      <div>Metadata similarity: {Math.min(99, finding.matchScore + 1)}%</div>
      <div>Watermark match: {finding.watermarkDetected ? 'Detected' : 'Not detected'}</div>
      <div className="font-mono font-bold text-2xl">{finding.matchScore}% Match</div>
      <div className="text-xs text-[#6B7280]">AI recommendation — human validation required.</div>
    </div>
  );
}

function NoticePanel({ notice, route, onGenerate, onApprove, onOpen }: {
  notice?: Notice; route?: { route: string; confidence: string; reason: string };
  onGenerate: () => void; onApprove: () => void; onOpen: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      {route && (
        <div className="rounded-xl border border-[#E2E8F0] p-3 text-xs">
          Recommended route: <b>{NOTICE_ROUTE_LABEL[route.route as keyof typeof NOTICE_ROUTE_LABEL] ?? route.route}</b> · Confidence {route.confidence}
          <div className="text-[#6B7280] mt-1">{route.reason}</div>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={onGenerate}>Generate Draft</Button>
        <Button size="sm" variant="outline" onClick={onOpen} disabled={!notice}>Preview</Button>
        <Button size="sm" variant="accent" onClick={onApprove} disabled={!notice}>Approve</Button>
      </div>
      {notice && (
        <div className="text-xs space-y-1">
          <div><b>Complainant</b> {notice.complainant}</div>
          <div><b>Work</b> {notice.copyrightedWork}</div>
          <div><b>Location</b> {notice.location}</div>
          <div className="text-[#9CA3AF]">{notice.goodFaithDeclaration}</div>
        </div>
      )}
    </div>
  );
}

function Compare({ original, rec, rea, evidence }: { original?: Finding; rec: CaseRecord; rea: Reappearance; evidence: Evidence[] }) {
  const rows = [
    ['URL', rec.url, rea.newUrl],
    ['Platform', rec.platform, rea.platform],
    ['Title', rec.title, rec.title],
    ['Uploader', rec.uploader, rea.uploader],
    ['ISBN', 'MATCH', rea.isbnMatch ? 'MATCH' : 'NO'],
    ['Watermark', 'MATCH', rea.watermarkMatch ? 'MATCH' : 'NO'],
    ['Fingerprint', 'MATCH', rea.fingerprintMatch ? 'MATCH' : 'NO'],
    ['Content', `${original?.matchScore ?? 98}%`, `${rea.similarity}% MATCH`],
  ];
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Side-by-side comparison</div>
      <table className="w-full text-xs">
        <thead><tr className="text-[#9CA3AF]"><th className="text-left py-1">Attribute</th><th className="text-left">Original</th><th className="text-left">New</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-[#E2E8F0]">
              <td className="py-2 font-semibold">{r[0]}</td>
              <td className="break-all pr-2">{r[1]}</td>
              <td className="break-all">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs">Evidence chain: {evidence[0]?.id ?? 'EV-0842-A'} → {evidence.find((e) => e.id === 'EV-1148-A')?.id ?? 'EV-1148-A'}</div>
    </div>
  );
}

interface CasePayload {
  case: CaseRecord;
  finding?: Finding;
  asset?: { title: string; author: string; isbn: string; segment: string; priorityTitle: boolean };
  evidence: Evidence[];
  rights: RightsValidation[];
  legal?: LegalReview;
  notices: Notice[];
  monitoring?: { windowDays: number; cadence: string; nextScanAt: string; status: string };
  reappearances: Reappearance[];
  transitions: { from: string | null; to: string; timestamp: string; reason: string }[];
  entity?: { name: string; riskScore: number };
  ai?: { recommendation: string; confidence: number; model: string; version: string; promptVersion: string; timestamp: string; methodology: string; inputs: Record<string, unknown> };
  route?: { route: string; confidence: string; reason: string };
  owner?: { name: string };
}
