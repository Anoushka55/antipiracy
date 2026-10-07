'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { post } from '@/lib/client';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Toast } from '@/components/shared/Overlay';
import { NOTICE_ROUTE_LABEL } from '@/lib/constants';
import type { AppConfiguration } from '@/lib/types';

/** A small on/off switch, styled to match the rest of the app's controls. */
function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[#00A36C]' : 'bg-[#CBD5E1]'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function ConfigurationPage() {
  const { data, loading, refresh } = useApi<{ configuration: AppConfiguration }>('configuration');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  if (loading || !data) return <PageLoader />;
  const c = data.configuration;

  async function save(key: string, patch: Partial<AppConfiguration>) {
    setSaving(key);
    try {
      await post('configuration/update', { patch });
      setToast('Configuration saved');
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  }

  const savePlatformEnabled = (id: string, enabled: boolean) =>
    save(`platform-${id}`, { platforms: c.platforms.map((p) => (p.id === id ? { ...p, enabled } : p)) });

  const saveSla = (risk: string, hours: number) =>
    save(`sla-${risk}`, { slaRules: c.slaRules.map((r) => (r.risk === risk ? { ...r, hours } : r)) });

  const saveRiskThreshold = (key: keyof AppConfiguration['riskThresholds'], value: number) =>
    save(`risk-${key}`, { riskThresholds: { ...c.riskThresholds, [key]: value } });

  const savePriorityWeight = (value: number) => save('priority-weight', { priorityTitleWeight: value });

  const saveCadence = (id: string, patch: Partial<AppConfiguration['monitoringCadence'][number]>) =>
    save(`cadence-${id}`, { monitoringCadence: c.monitoringCadence.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const saveTemplate = (id: string, patch: Partial<AppConfiguration['noticeTemplates'][number]>) =>
    save(`template-${id}`, { noticeTemplates: c.noticeTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const saveAi = (patch: Partial<AppConfiguration['ai']>) => save('ai', { ai: { ...c.ai, ...patch } });

  const saveRetention = (key: keyof AppConfiguration['retention'], value: number) =>
    save(`retention-${key}`, { retention: { ...c.retention, [key]: value } });

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold font-heading">Configuration</h1>
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
                <td className="py-2"><Toggle on={p.enabled} disabled={saving === `platform-${p.id}`} onChange={(v) => savePlatformEnabled(p.id, v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="SLA rules">
        {c.slaRules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 text-xs py-1">
            <span className="w-20 capitalize">{r.risk}</span>
            <input type="number" defaultValue={r.hours} disabled={saving === `sla-${r.risk}`} className="w-24 px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50" onBlur={(e) => saveSla(r.risk, Number(e.target.value))} />
            <span className="text-[#9CA3AF]">hours</span>
          </div>
        ))}
      </Section>

      <Section title="Risk thresholds">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {(['critical', 'high', 'medium'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <span className="capitalize text-[#6B7280]">{key} ≥</span>
              <input type="number" defaultValue={c.riskThresholds[key]} disabled={saving === `risk-${key}`} className="w-16 px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50" onBlur={(e) => saveRiskThreshold(key, Number(e.target.value))} />
            </label>
          ))}
          <label className="flex items-center gap-2">
            <span className="text-[#6B7280]">Priority title weight</span>
            <input type="number" step="0.05" defaultValue={c.priorityTitleWeight} disabled={saving === 'priority-weight'} className="w-16 px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50" onBlur={(e) => savePriorityWeight(Number(e.target.value))} />
          </label>
        </div>
      </Section>

      <Section title="Monitoring cadence">
        <table className="w-full text-xs">
          <thead><tr className="text-[#9CA3AF]">{['Risk', 'Initial cadence', 'Initial days', 'Then cadence'].map((h) => <th key={h} className="text-left py-2">{h}</th>)}</tr></thead>
          <tbody>
            {c.monitoringCadence.map((m) => (
              <tr key={m.id} className="border-t border-[#E2E8F0]">
                <td className="py-2 capitalize font-semibold">{m.risk}</td>
                <td className="py-2">
                  <select defaultValue={m.initialCadence} disabled={saving === `cadence-${m.id}`} onChange={(e) => saveCadence(m.id, { initialCadence: e.target.value as 'daily' | 'weekly' })} className="px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50 capitalize">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </td>
                <td className="py-2">
                  <input type="number" defaultValue={m.initialDays} disabled={saving === `cadence-${m.id}`} className="w-20 px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50" onBlur={(e) => saveCadence(m.id, { initialDays: Number(e.target.value) })} />
                </td>
                <td className="py-2">
                  <select defaultValue={m.thenCadence} disabled={saving === `cadence-${m.id}`} onChange={(e) => saveCadence(m.id, { thenCadence: e.target.value as 'weekly' | 'monthly' })} className="px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50 capitalize">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Notice templates">
        <div className="space-y-3">
          {c.noticeTemplates.map((t) => (
            <div key={t.id} className="rounded-xl border border-[#E2E8F0] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={t.name}
                  disabled={saving === `template-${t.id}`}
                  className="flex-1 px-2 py-1 text-xs font-semibold rounded-lg border border-[#E2E8F0] disabled:opacity-50"
                  onBlur={(e) => saveTemplate(t.id, { name: e.target.value })}
                />
                <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{NOTICE_ROUTE_LABEL[t.route]}</span>
              </div>
              <textarea
                defaultValue={t.body}
                disabled={saving === `template-${t.id}`}
                rows={2}
                className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-[#E2E8F0] disabled:opacity-50"
                onBlur={(e) => saveTemplate(t.id, { body: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="AI configuration">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-[#6B7280]">{c.ai.matchModel} {c.ai.matchVersion} · prompt {c.ai.promptVersion}</span>
          <label className="flex items-center gap-2">
            <span className="text-[#6B7280]">Enabled</span>
            <Toggle on={c.ai.enabled} disabled={saving === 'ai'} onChange={(v) => saveAi({ enabled: v })} />
          </label>
        </div>
      </Section>

      <Section title="Retention">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {([['evidenceDays', 'Evidence'], ['auditDays', 'Audit'], ['caseDays', 'Cases']] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <span className="text-[#6B7280]">{label}</span>
              <input type="number" defaultValue={c.retention[key]} disabled={saving === `retention-${key}`} className="w-20 px-2 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-50" onBlur={(e) => saveRetention(key, Number(e.target.value))} />
              <span className="text-[#9CA3AF]">days</span>
            </label>
          ))}
        </div>
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
