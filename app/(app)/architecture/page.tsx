'use client';

import { useState } from 'react';
import {
  ArrowDown,
  Bot,
  Cpu,
  Database,
  FolderArchive,
  Gavel,
  GitBranch,
  Globe,
  Layers,
  Radar,
  ScrollText,
  Send,
  Server,
  Shield,
  Users,
  Workflow,
} from 'lucide-react';
import { ArchitectureFlow, FlowCard, type FlowBand } from '@/components/shared/ArchitectureFlow';
import { PlatformArchitecture } from '@/components/shared/PlatformArchitecture';
import { Badge } from '@/components/shared/Badge';

const SYSTEM_BANDS: FlowBand[] = [
  {
    label: 'User',
    colorGroup: 'interface',
    cards: [
      {
        icon: Users,
        title: 'Role-based App Shell',
        description: 'Executive, Anti-Piracy Lead, Investigator, Legal Reviewer, Platform Operations, Administrator — one shell, RBAC-scoped navigation.',
      },
    ],
  },
  {
    label: 'Next.js App Router',
    colorGroup: 'interface',
    cards: [
      {
        icon: Server,
        title: 'Pages & controllers',
        description: 'app/(app)/* pages render the UI; app/api/[...slug] is a single catch-all controller for every read and mutation.',
        tags: ['Next.js 15.5', 'React 19.2', 'TypeScript 5.9'],
      },
      {
        icon: Layers,
        title: 'Styling & UI',
        description: 'Design-system primitives (Card, Badge, Domain components) render every page from the same token set.',
        tags: ['Tailwind 3.4', 'Recharts 2.15', 'Framer Motion 12.4', 'lucide-react'],
      },
    ],
  },
  {
    label: 'Services',
    colorGroup: 'intelligence',
    cards: [
      {
        icon: Workflow,
        title: 'CaseWorkflowService',
        description: 'The only place a case status may change. Validates RBAC, current state, and required data before persisting and auditing.',
        tags: ['lib/workflow.ts'],
      },
      {
        icon: Bot,
        title: 'MockAIService',
        description: 'Classifies findings, scores similarity, recommends priority and notice route — deterministic, rule-based, never autonomous.',
        tags: ['lib/ai.ts'],
      },
      {
        icon: Radar,
        title: 'Discovery connectors',
        description: 'Telegram, Web, Marketplace, and Cloud Storage connectors emit synthetic findings behind one shared interface.',
        tags: ['lib/connectors.ts'],
      },
      {
        icon: GitBranch,
        title: 'SLA & gates',
        description: 'SLA due-dates, breach state, and the four-gate rights-validation rules used across every case.',
        tags: ['lib/sla.ts'],
      },
      {
        icon: ScrollText,
        title: 'Analytics & demo orchestrator',
        description: 'Executive KPIs, report generation, global search, and the scripted end-to-end demo story.',
        tags: ['lib/analytics.ts', 'lib/demo.ts'],
      },
    ],
  },
  {
    label: 'Store',
    colorGroup: 'data',
    cards: [
      {
        icon: Database,
        title: 'Tenant AppState (SCHAND)',
        description: 'In-memory state for every entity, optionally persisted to a local JSON file when the filesystem is writable (disabled on Vercel).',
        tags: ['lib/store.ts', 'data/runtime-store.json'],
      },
    ],
  },
];

const AI_ALLOWED = ['Classify findings', 'Score similarity', 'Draft notices', 'Recommend notice routes', 'Detect reappearance'];
const AI_NOT_ALLOWED = ['Approve rights', 'Approve legal action', 'Dispatch notices', 'Close high-risk cases'];

const GATES = [
  'Rights / ownership',
  'Infringement substantiated',
  'Authorization (not a licensed partner/school)',
  'Actionable target (reachable intermediary)',
];

function SystemArchitectureView() {
  return (
    <div className="space-y-8">
      <ArchitectureFlow bands={SYSTEM_BANDS} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Four-gate validation</div>
          <ol className="space-y-1.5 text-xs text-[#1A1F36] list-decimal list-inside">
            {GATES.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
          <p className="text-[11px] text-[#6B7280] mt-3">Legal submission is blocked unless all four pass.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Agentic but controlled</div>
          <div className="text-[11px] font-semibold text-[#00A36C] mb-1">AI may</div>
          <ul className="text-xs text-[#1A1F36] space-y-1 mb-3">
            {AI_ALLOWED.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
          <div className="text-[11px] font-semibold text-[#DC2626] mb-1">AI may not</div>
          <ul className="text-xs text-[#1A1F36] space-y-1">
            {AI_NOT_ALLOWED.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Security</div>
          <ul className="text-xs text-[#1A1F36] space-y-1.5">
            <li>· JWT session, 12h expiry, httpOnly cookie</li>
            <li>· RBAC enforced in services, not just UI</li>
            <li>· Every record tenant-scoped (SCHAND)</li>
            <li>· Audit log for login/logout and material mutations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const LIFECYCLE_STAGES: { n: number; label: string; owner: string; color: string }[] = [
  { n: 1, label: 'Piracy Detection', owner: 'Investigator', color: '#00338D' },
  { n: 2, label: 'Case Creation & Prioritisation', owner: 'Investigator', color: '#00338D' },
  { n: 3, label: 'Evidence Collection', owner: 'Investigator', color: '#00338D' },
  { n: 4, label: 'Evidence Validation', owner: 'Legal Reviewer', color: '#0077C8' },
  { n: 5, label: 'Legal Assessment', owner: 'Legal Reviewer', color: '#0077C8' },
  { n: 6, label: 'Takedown Notice Preparation', owner: 'Legal Reviewer', color: '#0077C8' },
  { n: 7, label: 'Platform Submission', owner: 'Platform Operations', color: '#D4A017' },
  { n: 8, label: 'Tracking & Follow-up', owner: 'Platform Operations', color: '#D4A017' },
  { n: 9, label: 'Reappearance Monitoring', owner: 'Anti-Piracy Lead', color: '#8B1E3F' },
  { n: 10, label: 'Case Closure', owner: 'Anti-Piracy Lead', color: '#8B1E3F' },
];

const PROTECT_STAGES = [
  { id: 'D1', title: 'Standardized Takedown Workflow', desc: 'Defines the end-to-end case lifecycle, ownership, decision gates, SLAs and closure requirements.' },
  { id: 'D2', title: 'Evidence Capture Standards', desc: 'Defines the minimum evidence package, capture sequence, integrity controls and chain of custody.' },
  { id: 'D3', title: 'Takedown Notice Templates', desc: 'Defines platform- and jurisdiction-specific notice requirements, approvals and reusable templates.' },
  { id: 'D4', title: 'Escalation & Tracking Matrix', desc: 'Defines acknowledgement/removal SLAs, escalation triggers and alternate enforcement routes.' },
  { id: 'D5', title: 'Reappearance Monitoring', desc: 'Defines post-removal surveillance, recurrence matching and reopening criteria for content that reappears.' },
];

function CaseLifecycleView() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">D1 — Standardized takedown workflow</div>
        <p className="text-xs text-[#6B7280] mb-4">
          A controlled ten-stage lifecycle converts each detected infringement into an evidence-backed, legally approved and
          traceable enforcement case, with defined decision gates, ownership and closure criteria.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {LIFECYCLE_STAGES.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-[11px] font-semibold min-w-[150px]"
                style={{ backgroundColor: s.color }}
              >
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px] flex-shrink-0">{s.n}</span>
                <span>{s.label}</span>
              </div>
              {i < LIFECYCLE_STAGES.length - 1 && <span className="text-[#9CA3AF]">→</span>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-[#6B7280]">
          {[
            ['#00338D', 'Investigator'],
            ['#0077C8', 'Legal Reviewer'],
            ['#D4A017', 'Platform Operations'],
            ['#8B1E3F', 'Anti-Piracy Lead'],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Five-stage process aligning PROTECT framework</div>
        <p className="text-xs text-[#6B7280] mb-4">
          D1 establishes the case lifecycle, D2 defines evidentiary requirements, D3 standardizes enforcement notices, D4
          governs post-submission escalation, and D5 closes the loop through reappearance monitoring.
        </p>
        <div className="flex flex-wrap gap-3">
          {PROTECT_STAGES.map((s) => (
            <FlowCard
              key={s.id}
              icon={s.id === 'D1' ? Workflow : s.id === 'D2' ? FolderArchive : s.id === 'D3' ? Send : s.id === 'D4' ? Gavel : Radar}
              title={`${s.id} — ${s.title}`}
              description={s.desc}
              color="#00338D"
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-[#6B7280]">
          <ArrowDown size={14} className="rotate-90" />
          Closed-loop control: a confirmed reappearance is linked to the original case and re-enters D1 for risk-based
          reassessment — preserving enforcement history, evidence lineage and repeat-infringement intelligence.
        </div>
      </div>

      <div className="rounded-2xl border border-[#00338D]/15 bg-[#00338D]/5 p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#00338D] mb-2">Control principle</div>
        <p className="text-xs text-[#1A1F36]">
          Every detected infringement must reach a documented disposition —{' '}
          <Badge color="grey" size="xs">Rejected</Badge> ·{' '}
          <Badge color="amber" size="xs">Monitoring</Badge> ·{' '}
          <Badge color="blue" size="xs">Enforcement Initiated</Badge> ·{' '}
          <Badge color="green" size="xs">Removed</Badge> ·{' '}
          <Badge color="red" size="xs">Escalated</Badge> ·{' '}
          <Badge color="navy" size="xs">Closed</Badge> — with decision rationale, evidence and accountable owner retained
          against the case record.
        </p>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'platform', label: 'Platform Architecture' },
  { id: 'system', label: 'Technical Stack' },
  { id: 'lifecycle', label: 'Case Lifecycle' },
] as const;

export default function ArchitecturePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('platform');

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Reference</div>
        <h1 className="text-2xl font-bold">Architecture</h1>
        <p className="text-sm text-[#6B7280]">How this platform is built, and the enforcement process it runs on.</p>
      </div>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-[#00338D] text-white' : 'bg-white border border-[#E2E8F0] text-[#6B7280] hover:text-[#1A1F36]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'platform' && <PlatformArchitecture />}
      {tab === 'system' && <SystemArchitectureView />}
      {tab === 'lifecycle' && <CaseLifecycleView />}
    </div>
  );
}
