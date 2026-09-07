'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/shared/Badge';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Drawer, SyntheticBanner } from '@/components/shared/Overlay';
import { EntityNetwork } from '@/components/shared/EntityGraph';
import { useState } from 'react';
import type { EntityRecord, EntityRelationship } from '@/lib/types';

export default function EntitiesPage() {
  const { data, loading } = useApi<{ items: EntityRecord[]; relationships: EntityRelationship[] }>('entities');
  const [why, setWhy] = useState<EntityRecord | null>(null);
  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Repeat Offender Intelligence</h1>
          <p className="text-sm text-[#6B7280]">Entity clustering across uploaders, channels, domains and marketplace sellers. Scores are deterministic and configurable.</p>
        </div>
        <SyntheticBanner />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.items.map((e) => (
          <Link key={e.id} href={`/entities/${e.id}`} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{e.name}</div>
                <div className="text-[11px] text-[#6B7280]">{e.kind.replace('_', ' ')}</div>
              </div>
              <div className="font-mono font-bold text-xl">{e.riskScore}<span className="text-xs text-[#9CA3AF]">/100</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
              <div>Cases {e.previousCases}</div>
              <div>Removed {e.successfulRemovals}</div>
              <div>Reapp. {e.reappearances}</div>
            </div>
            <div className="mt-2 flex gap-1 flex-wrap">{e.labels.map((l) => <Badge key={l} color="red">{l}</Badge>)}</div>
            <button className="text-[11px] text-[#00338D] mt-2" onClick={(ev) => { ev.preventDefault(); setWhy(e); }}>Why?</button>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-xs font-semibold mb-1">Relationship graph</div>
        <p className="text-[11px] text-[#6B7280] mb-3">Synthetic clustering of the eight watched actors. Edge weight is the deterministic link score (0–100). Click a node to open the entity record.</p>
        <EntityNetwork entities={data.items} relationships={data.relationships} />
      </div>
      {why && (
        <Drawer title={`Why ${why.name}?`} onClose={() => setWhy(null)}>
          <div className="text-xs space-y-2">
            <div>Previous infringement count: {why.previousCases}</div>
            <div>Reappearance frequency: {why.reappearances}</div>
            <div>Average time to reappearance: {why.avgTimeToReappearanceDays} days</div>
            <div>Platforms: {why.platforms.join(', ')}</div>
            <div>Linked domains: {why.linkedDomains.join(', ')}</div>
            <div>Successful enforcement: {why.successfulRemovals}</div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
