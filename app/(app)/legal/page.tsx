'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, FileText, Gavel, PauseCircle, ShieldCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { Badge, PlatformBadge, RiskBadge, SlaBadge } from '@/components/shared/Badge';
import { MetricCard } from '@/components/shared/Card';
import { PageLoader } from '@/components/shared/LoadingDots';
import { CASE_STATUS_LABEL, NOTICE_ROUTE_LABEL } from '@/lib/constants';
import type { NoticeRoute } from '@/lib/types';

interface LegalItem {
  id: string;
  title: string;
  platform: string;
  risk: string;
  status: string;
  slaState: string;
  daysOpen: number;
  gatesPassed: number;
  gatesHeld: number;
  legalStatus: 'pending' | 'approved' | 'hold' | 'rejected' | null;
  recommendedRoute: NoticeRoute;
  noticeId: string | null;
}

const FILTERS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'rights', label: 'Rights validation', statuses: ['rights_validation'] },
  { id: 'legal', label: 'Legal review', statuses: ['legal_review'] },
  { id: 'hold', label: 'On hold', statuses: ['approved_hold'] },
  { id: 'ready', label: 'Ready for notice', statuses: ['legal_approved', 'notice_ready'] },
] as const;

/** What the legal team should do next for a case, in plain words. */
function nextStep(i: LegalItem): string {
  if (i.status === 'rights_validation') return 'Validate the four rights gates';
  if (i.status === 'approved_hold') return 'Resolve the held gate';
  if (i.status === 'legal_review') return 'Approve legal action';
  if (i.status === 'legal_approved') return 'Generate the draft notice';
  if (i.status === 'notice_ready') return i.noticeId ? 'Review and approve the notice' : 'Generate the draft notice';
  return 'Open the case';
}

export default function LegalReviewPage() {
  const { data, loading } = useApi<{
    counts: { rightsValidation: number; legalReview: number; onHold: number; readyForNotice: number };
    items: LegalItem[];
  }>('legal');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  if (loading || !data) return <PageLoader />;
  const active = FILTERS.find((f) => f.id === filter)!;
  const rows = active.statuses ? data.items.filter((i) => (active.statuses as readonly string[]).includes(i.status)) : data.items;

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1F36]">Legal Review</h1>
        <p className="text-sm text-[#6B7280] mt-1">Every case waiting on a legal decision: four-gate rights validation, legal approval, and the notice that follows.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Awaiting rights validation" value={data.counts.rightsValidation} icon={ShieldCheck} color="#0077C8" />
        <MetricCard label="Awaiting legal approval" value={data.counts.legalReview} icon={Gavel} color="#00338D" />
        <MetricCard label="On hold" value={data.counts.onHold} icon={PauseCircle} color="#D4A017" />
        <MetricCard label="Ready for a notice" value={data.counts.readyForNotice} icon={FileText} color="#00A36C" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === f.id ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0] text-[#6B7280]'}`}
          >
            {f.label}
          </button>
        ))}
        <Link href="/notices" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#00338D] hover:underline">
          Open Notices <ArrowRight size={13} />
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>
              {['Case', 'Title', 'Platform', 'Risk', 'Stage', 'Four gates', 'Legal', 'Recommended notice', 'SLA', 'Next step'].map((h) => (
                <th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-[#9CA3AF]">No cases at this stage.</td></tr>
            )}
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-[#E2E8F0] hover:bg-[#F4F6F9]">
                <td className="px-3 py-3 font-mono font-semibold"><Link className="text-[#00338D]" href={`/cases/${i.id}?tab=legal`}>{i.id}</Link></td>
                <td className="px-3 py-3 font-medium">{i.title}</td>
                <td className="px-3 py-3"><PlatformBadge platform={i.platform} /></td>
                <td className="px-3 py-3"><RiskBadge risk={i.risk} /></td>
                <td className="px-3 py-3 whitespace-nowrap"><Badge color="navy">{CASE_STATUS_LABEL[i.status] ?? i.status}</Badge></td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`font-mono font-semibold ${i.gatesPassed === 4 ? 'text-[#00A36C]' : i.gatesHeld ? 'text-[#D4A017]' : 'text-[#6B7280]'}`}>{i.gatesPassed} / 4</span>
                  {i.gatesHeld > 0 && <span className="text-[#D4A017]"> · {i.gatesHeld} held</span>}
                </td>
                <td className="px-3 py-3 capitalize">{i.legalStatus ?? '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">{NOTICE_ROUTE_LABEL[i.recommendedRoute]}</td>
                <td className="px-3 py-3"><SlaBadge state={i.slaState} /></td>
                <td className="px-3 py-3">
                  <Link href={i.status === 'notice_ready' && i.noticeId ? `/notices?id=${i.noticeId}` : `/cases/${i.id}?tab=${i.status === 'legal_approved' ? 'notice' : 'legal'}`} className="inline-flex items-center gap-1 font-semibold text-[#00338D] hover:underline whitespace-nowrap">
                    {nextStep(i)} <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
