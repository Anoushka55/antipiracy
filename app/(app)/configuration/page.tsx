'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Toast } from '@/components/shared/Overlay';
import { NOTICE_ROUTE_LABEL } from '@/lib/constants';
import type { AppConfiguration } from '@/lib/types';

export default function ConfigurationPage() {
  const { data, loading, refresh } = useApi<{ configuration: AppConfiguration }>('configuration');
  const [toast, setToast] = useState('');
  if (loading || !data) return <PageLoader />;
  const c = data.configuration;

  async function saveSla(risk: string, hours: number) {
    const slaRules = c.slaRules.map((r) => r.risk === risk ? { ...r, hours } : r);
    await post('configuration/update', { patch: { slaRules } });
    setToast('Configuration saved');
    await refresh();
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Configuration</h1>
      <p className="text-sm text-[#6B7280]">Tenant SCHAND · configurable, not client-coded.</p>
      <Section title="Platforms">
        <table className="w-full text-xs">
          <thead><tr className="text-[#9CA3AF]">{['Platform', 'Category', 'Default SLA', 'Notice routes', 'Enabled'].map((h) => <th key={h} className="text-left py-2">{h}</th>)}</tr></thead>
          <tbody>
            {c.platforms.map((p) => (
              <tr key={p.id} className="border-t border-[#E2E8F0]">
                <td className="py-2 font-semibold">{p.name}</td>
                <td>{p.category}</td>
                <td>{p.defaultSlaHours}h</td>
                <td>{p.supportedNoticeRoutes.map((r) => NOTICE_ROUTE_LABEL[r]).join(', ')}</td>
                <td>{p.enabled ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="SLA rules">
        {c.slaRules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 text-xs py-1">
            <span className="w-20 capitalize">{r.risk}</span>
            <input type="number" defaultValue={r.hours} className="w-24 px-2 py-1 rounded-lg border border-[#E2E8F0]" onBlur={(e) => saveSla(r.risk, Number(e.target.value))} />
            <span className="text-[#9CA3AF]">hours</span>
          </div>
        ))}
      </Section>
      <Section title="Risk thresholds">
        <div className="text-xs">Critical ≥ {c.riskThresholds.critical} · High ≥ {c.riskThresholds.high} · Medium ≥ {c.riskThresholds.medium} · Priority title weight {c.priorityTitleWeight}</div>
      </Section>
      <Section title="Monitoring cadence">
        {c.monitoringCadence.map((m) => (
          <div key={m.id} className="text-xs py-1 capitalize">{m.risk}: {m.initialCadence} {m.initialDays} days then {m.thenCadence}</div>
        ))}
      </Section>
      <Section title="Notice templates">
        {c.noticeTemplates.map((t) => <div key={t.id} className="text-xs py-1">{t.name}</div>)}
      </Section>
      <Section title="AI configuration">
        <div className="text-xs">{c.ai.matchModel} {c.ai.matchVersion} · prompt {c.ai.promptVersion} · {c.ai.enabled ? 'enabled' : 'disabled'}</div>
      </Section>
      <Section title="Retention">
        <div className="text-xs">Evidence {c.retention.evidenceDays}d · Audit {c.retention.auditDays}d · Cases {c.retention.caseDays}d</div>
      </Section>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">{title}</div>
      {children}
    </div>
  );
}
