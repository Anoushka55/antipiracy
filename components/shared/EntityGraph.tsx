'use client';

import type { EntityRecord, EntityRelationship } from '@/lib/types';

const EDGE_LABEL: Record<EntityRelationship['type'], string> = {
  same_operator: 'Same operator',
  linked_channel: 'Linked channel',
  mirror_of: 'Mirror of',
  shared_payment: 'Shared payment',
  related: 'Related',
};

const POS: Record<string, { x: number; y: number }> = {
  'ENT-0001': { x: 210, y: 62 },
  'ENT-0003': { x: 48, y: 210 },
  'ENT-0007': { x: 210, y: 258 },
  'ENT-0009': { x: 410, y: 258 },
  'ENT-0002': { x: 580, y: 62 },
  'ENT-0005': { x: 780, y: 62 },
  'ENT-0004': { x: 580, y: 258 },
  'ENT-0006': { x: 780, y: 258 },
};

function nodeColor(score: number) {
  if (score >= 80) return '#c83328';
  if (score >= 60) return '#D4A017';
  return '#111111';
}

export function EntityNetwork({
  entities,
  relationships,
  highlightId,
}: {
  entities: EntityRecord[];
  relationships: EntityRelationship[];
  highlightId?: string;
}) {
  const byId = Object.fromEntries(entities.map((e) => [e.id, e]));
  const used = new Set<string>();
  relationships.forEach((r) => {
    used.add(r.fromEntityId);
    used.add(r.toEntityId);
  });
  const nodes = [...used]
    .map((id) => byId[id])
    .filter(Boolean)
    .map((e) => ({ ...e, ...fallbackPos(e.id, [...used].indexOf(e.id)) }));

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 920 340" className="w-full min-w-[720px] h-[340px]">
          <text x="48" y="22" fill="#9CA3AF" fontSize="10" fontWeight="700" letterSpacing="1.4">TELEGRAM REDISTRIBUTION RING</text>
          <text x="580" y="22" fill="#9CA3AF" fontSize="10" fontWeight="700" letterSpacing="1.4">FILE-HOST AND MARKETPLACE CLUSTERS</text>
          {relationships.map((r) => {
            const a = POS[r.fromEntityId] ?? nodes.find((n) => n.id === r.fromEntityId);
            const b = POS[r.toEntityId] ?? nodes.find((n) => n.id === r.toEntityId);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <g key={r.id}>
                <line x1={a.x + 70} y1={a.y + 22} x2={b.x + 70} y2={b.y + 22} stroke="#C5D0DE" strokeWidth="2" />
                <rect x={mx + 8} y={my - 8} width="118" height="18" rx="4" fill="#F4F6F9" />
                <text x={mx + 67} y={my + 5} textAnchor="middle" fill="#6B7280" fontSize="9">
                  {EDGE_LABEL[r.type]} · {Math.round(r.weight * 100)}
                </text>
              </g>
            );
          })}
          {nodes.map((e) => {
            const p = POS[e.id] ?? { x: e.x, y: e.y };
            const color = nodeColor(e.riskScore);
            const active = highlightId === e.id;
            return (
              <a key={e.id} href={`/entities/${e.id}`}>
                <g className="cursor-pointer">
                  <rect
                    x={p.x}
                    y={p.y}
                    width="148"
                    height="48"
                    rx="10"
                    fill="white"
                    stroke={active ? color : '#E2E8F0'}
                    strokeWidth={active ? 2.5 : 1}
                  />
                  <rect x={p.x} y={p.y} width="4" height="48" rx="2" fill={color} />
                  <text x={p.x + 14} y={p.y + 20} fill="#111111" fontSize="11" fontWeight="700">
                    {shortName(e.name)}
                  </text>
                  <text x={p.x + 14} y={p.y + 36} fill="#9CA3AF" fontSize="9">
                    {e.kind.replaceAll('_', ' ')} · {e.riskScore}
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
      </div>
      <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
        AcademicLeaks_IN is the hub: same operator as StudyVault_Admin (72) and a linked channel to CBSE_NotesHub (61).
        After Telegram takedown, StudyVault mirrors onto files.example-demo.com (81) — the SC-2026-0842 reappearance path.
        Separate clusters: FreeStudyHub ↔ PDFBay_Admin, and EduBooks Wholesale ↔ ExamSeason_Share via shared payment.
      </p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>{['From', 'Relationship', 'To', 'Weight', 'Why it matters'].map((h) => <th key={h} className="text-left py-2 pr-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {relationships.map((r) => (
              <tr key={r.id} className="border-b border-[#E2E8F0]">
                <td className="py-2 pr-3 font-semibold">{byId[r.fromEntityId]?.name ?? r.fromEntityId}</td>
                <td className="py-2 pr-3">{EDGE_LABEL[r.type]}</td>
                <td className="py-2 pr-3 font-semibold">{byId[r.toEntityId]?.name ?? r.toEntityId}</td>
                <td className="py-2 pr-3 font-mono">{Math.round(r.weight * 100)}</td>
                <td className="py-2 text-[#6B7280]">{why(r.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function why(type: EntityRelationship['type']) {
  if (type === 'same_operator') return 'Treat as one actor for enforcement and notice routing.';
  if (type === 'linked_channel') return 'Takedown on one channel will likely reappear on the other.';
  if (type === 'mirror_of') return 'Closed-loop reappearance — do not auto-send a new notice.';
  if (type === 'shared_payment') return 'Shared monetisation trail for legal clustering.';
  return 'Weak association — investigate before merging entities.';
}

function shortName(name: string) {
  return name.length > 20 ? `${name.slice(0, 18)}…` : name;
}

function fallbackPos(id: string, i: number) {
  return POS[id] ?? { x: 40 + (i % 4) * 220, y: 70 + Math.floor(i / 4) * 180 };
}
