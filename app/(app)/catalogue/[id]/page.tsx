'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import type { CaseRecord, CatalogueAsset, Finding } from '@/lib/types';

export default function CatalogueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<{ asset: CatalogueAsset; relatedCases: CaseRecord[]; findings: Finding[] }>(`catalogue?id=${id}`);
  if (loading || !data) return <PageLoader />;
  const a = data.asset;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{a.title}</h1>
      <p className="text-sm text-[#6B7280]">{a.author} · {a.segment}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Info title="Asset profile" items={[['ISBN', a.isbn], ['Edition', a.edition], ['Category', a.category], ['Release', a.releaseDate]]} />
        <Info title="Rights" items={[['Owner', a.rightsOwner], ['Territories', a.territories.join(', ')], ['Status', a.status]]} />
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Protection</div>
          {a.priorityTitle && <Badge color="red">Priority title</Badge>}
          <div className="text-xs mt-3">Aliases: {a.aliases.join('; ')}</div>
          <div className="text-xs mt-2">Known piracy patterns:</div>
          <ul className="text-xs list-disc ml-4 text-[#6B7280]">{a.piracyPatterns.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Related cases</div>
        {data.relatedCases.slice(0, 12).map((c) => (
          <div key={c.id} className="text-xs py-1"><Link className="text-[#00338D] font-mono" href={`/cases/${c.id}`}>{c.id}</Link> · {c.status} · {c.platform}</div>
        ))}
      </div>
    </div>
  );
}

function Info({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-xs space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{title}</div>
      {items.map(([k, v]) => <div key={k}><span className="text-[#9CA3AF]">{k}</span> · {v}</div>)}
    </div>
  );
}
