'use client';

import { useApi } from '@/hooks/useApi';
import { PageLoader } from '@/components/shared/LoadingDots';
import type { AuditEvent } from '@/lib/types';

export default function AuditPage() {
  const { data, loading } = useApi<{ items: AuditEvent[] }>('audit');
  if (loading || !data) return <PageLoader />;
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Immutable Audit History</h1>
      <p className="text-sm text-[#6B7280]">Every material action is recorded with actor, entity, before/after and session metadata.</p>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>{['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Before', 'After'].map((h) => <th key={h} className="text-left px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((a) => (
              <tr key={a.id} className="border-b border-[#E2E8F0] align-top">
                <td className="px-3 py-3 font-mono whitespace-nowrap">{a.timestamp.replace('T', ' ').slice(0, 19)}</td>
                <td className="px-3 py-3">{a.userName}</td>
                <td className="px-3 py-3">{a.role}</td>
                <td className="px-3 py-3 font-semibold">{a.action}</td>
                <td className="px-3 py-3">{a.entity}</td>
                <td className="px-3 py-3 font-mono">{a.entityId}</td>
                <td className="px-3 py-3 font-mono text-[10px] max-w-[180px] truncate">{JSON.stringify(a.before)}</td>
                <td className="px-3 py-3 font-mono text-[10px] max-w-[180px] truncate">{JSON.stringify(a.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
