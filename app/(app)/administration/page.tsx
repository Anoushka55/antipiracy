'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { PageLoader, LoadingDots } from '@/components/shared/LoadingDots';
import { Toast } from '@/components/shared/Overlay';
import { ROLE_LABEL } from '@/lib/constants';
import type { Connector, Job, User } from '@/lib/types';

export default function AdminPage() {
  const { data, loading, refresh } = useApi<{
    connectors: Connector[];
    jobs: Job[];
    users: Omit<User, 'passwordHash'>[];
    health: Record<string, number>;
  }>('admin');
  const [toast, setToast] = useState('');
  const [story, setStory] = useState<null | { logs: string[]; originalCase: string; newFinding: string; ticketId: string }>(null);
  const [running, setRunning] = useState(false);

  async function run(path: string, ok: string, body: Record<string, unknown> = {}) {
    const r = await post<Record<string, unknown>>(path, body);
    setToast(ok);
    if (path === 'demo/story') setStory(r as never);
    await refresh();
    return r;
  }

  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Administration</h1>
      <p className="text-sm text-[#6B7280]">Technology operations · connector health · demo controls · identity</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat k="Queue depth" v={data.health.queueDepth} />
        <Stat k="Failed jobs" v={data.health.failed} />
        <Stat k="Avg processing" v={`${data.health.avgMs} ms`} />
        <Stat k="Evidence store" v={`${data.health.storageGb} GB`} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Connectors</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.connectors.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#E2E8F0] p-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-[#6B7280]">{c.kind} · {c.avgMs} ms · errors {(c.errorRate * 100).toFixed(0)}%</div>
              </div>
              <Badge color={c.status === 'healthy' ? 'green' : 'amber'}>{c.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Demo data controls</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => run('demo/reset', 'Demo data reset')}>Reset Demo Data</Button>
          <Button size="sm" variant="outline" onClick={() => run('demo/seed', 'Demo scenario seeded')}>Seed Demo Scenario</Button>
          <Button size="sm" variant="outline" onClick={() => run('demo/findings', 'Additional findings generated')}>Generate Additional Findings</Button>
          <Button size="sm" variant="outline" onClick={() => run('demo/responses', 'Platform responses simulated')}>Simulate Platform Responses</Button>
          <Button size="sm" variant="amber" onClick={() => run('radar/simulate', 'Reappearance simulated', { caseId: 'SC-2026-0842' })}>Simulate Reappearance</Button>
          <Button size="sm" onClick={async () => { setRunning(true); await run('demo/story', 'Closed-loop story complete'); setRunning(false); }}>Run Full Anti-Piracy Story</Button>
        </div>
        {running && <div className="flex items-center gap-2 text-xs"><LoadingDots /><span>Running closed-loop demonstration…</span></div>}
        {story && (
          <div className="rounded-xl border border-[#00A36C]/30 bg-[#F0FDF4] p-4 text-xs space-y-1">
            <div className="font-bold text-[#00A36C]">CLOSED-LOOP ENFORCEMENT COMPLETE</div>
            <div>Original Incident: {story.originalCase}</div>
            <div>Enforcement: SUCCESSFUL · Ticket {story.ticketId}</div>
            <div>Reappearance: DETECTED · New Finding {story.newFinding}</div>
            <div>Repeat Offender: IDENTIFIED · Case: REOPENED</div>
            <p className="mt-2 text-[#1A1F36]">Protection does not stop at takedown. Every enforcement event feeds the next detection cycle.</p>
            <ul className="mt-2 text-[#6B7280]">{story.logs.map((l) => <li key={l}>{l}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Users & roles</div>
        {data.users.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-xs py-2 border-b border-[#E2E8F0]">
            <div><b>{u.name}</b> · {u.email}</div>
            <Badge color="navy">{ROLE_LABEL[u.role]}</Badge>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Jobs</div>
        {data.jobs.length === 0 && <div className="text-xs text-[#6B7280]">No jobs yet. Run a discovery scan or demo story.</div>}
        {data.jobs.map((j) => (
          <div key={j.id} className="text-xs py-2 border-b border-[#E2E8F0]">
            <span className="font-mono">{j.id}</span> · {j.type} · {j.status} · {j.message}
          </div>
        ))}
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
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
