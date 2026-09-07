'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Badge } from '@/components/shared/Badge';
import { EntityNetwork } from '@/components/shared/EntityGraph';
import type { CaseRecord, EntityRecord, EntityRelationship } from '@/lib/types';

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<{ entity: EntityRecord; relationships: EntityRelationship[]; cases: CaseRecord[]; nodes: EntityRecord[] }>(`entities?id=${id}`);
  if (loading || !data) return <PageLoader />;
  const e = data.entity;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{e.name}</h1>
          <p className="text-sm text-[#6B7280]">{e.kind.replaceAll('_', ' ')} · tenant SCHAND</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-3xl">{e.riskScore}<span className="text-sm text-[#9CA3AF]">/100</span></div>
          {e.labels.map((l) => <Badge key={l} color="red">{l}</Badge>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat k="Previous cases" v={e.previousCases} />
        <Stat k="Successful removals" v={e.successfulRemovals} />
        <Stat k="Reappearances" v={e.reappearances} />
        <Stat k="Avg. reappearance" v={`${e.avgTimeToReappearanceDays} days`} />
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-xs font-semibold mb-1">Linked cases</div>
        {data.cases.length === 0 && <p className="text-xs text-[#6B7280]">No live cases currently attached to this entity.</p>}
        {data.cases.map((c) => (
          <div key={c.id} className="text-xs py-1">
            <Link className="text-[#c83328] font-mono" href={`/cases/${c.id}`}>{c.id}</Link> {c.title}
          </div>
        ))}
      </div>
      {data.relationships.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <div className="text-xs font-semibold mb-1">Neighbourhood graph</div>
          <p className="text-[11px] text-[#6B7280] mb-3">Relationships that include this entity, drawn on the full synthetic cluster.</p>
          <EntityNetwork entities={data.nodes} relationships={data.relationships} highlightId={e.id} />
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{k}</div>
      <div className="font-mono font-bold text-xl">{v}</div>
    </div>
  );
}
