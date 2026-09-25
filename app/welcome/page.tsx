'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutDashboard, Compass, BookOpen, FileSearch, Shield, FolderArchive, Gavel, Radar, BarChart3, Users, ScrollText, Settings, SlidersHorizontal, Bot, LogOut } from 'lucide-react';
import { api, post } from '@/lib/client';
import { ChatThread, type QuickStart } from '@/components/shared/ChatThread';
import { navAllowed } from '@/lib/rbac';
import { PAGE_GUIDES } from '@/lib/kbot-knowledge';
import { KPMG_LOGO, ROLE_LABEL, SCHAND_LOGO, destinationForEmail } from '@/lib/constants';
import type { Role, SessionUser } from '@/lib/types';

const PILLARS = ['Discover', 'Investigate', 'Validate', 'Enforce', 'Monitor', 'LLM Probe'];
const ROLE_ORDER: Role[] = ['executive', 'lead', 'investigator', 'legal', 'operations', 'admin'];

interface QuickStartSpec {
  pageId: string;
  icon: QuickStart['icon'];
  title: string;
  description: string;
  prompt: string;
}

/**
 * Per-role quick-start menus — each entry maps to a real PAGE_GUIDES page
 * (filtered by RBAC below) and a real prompt routed through the same
 * answerQuery() engine, so every card reflects what that role would
 * actually want to do first rather than a generic fallback chain.
 */
const ROLE_QUICK_STARTS: Record<Role, QuickStartSpec[]> = {
  executive: [
    { pageId: 'overview', icon: LayoutDashboard, title: "Today's overview", description: 'Active cases, SLA breaches, top alerts', prompt: 'how do I use overview' },
    { pageId: 'analytics', icon: BarChart3, title: 'Risk & predictive analytics', description: 'Exposure trend and AI forecasts', prompt: 'how do I use analytics' },
    { pageId: 'reports', icon: ScrollText, title: 'Generate a report', description: 'Executive, weekly, and financial exposure reports', prompt: 'how do I use reports' },
    { pageId: 'entities', icon: Users, title: 'Repeat offenders', description: 'Entities driving the most reappearances', prompt: 'how do I use repeat offenders' },
  ],
  lead: [
    { pageId: 'overview', icon: LayoutDashboard, title: "Today's overview", description: 'Active cases, SLA breaches, top alerts', prompt: 'how do I use overview' },
    { pageId: 'discovery', icon: FileSearch, title: 'Review new findings', description: 'Triage the discovery queue', prompt: 'how do I use discovery' },
    { pageId: 'cases', icon: Shield, title: 'Cases needing a decision', description: 'Rights validation and legal review status', prompt: 'what should I do next' },
    { pageId: 'audit', icon: ScrollText, title: 'Audit log', description: 'Who approved what, and when', prompt: 'how do I use audit log' },
  ],
  investigator: [
    { pageId: 'discovery', icon: FileSearch, title: 'New findings to triage', description: 'Validate or reject AI-flagged detections', prompt: 'how do I use discovery' },
    { pageId: 'investigations', icon: Compass, title: 'My open investigations', description: 'Add notes and confirm infringement', prompt: 'how do I use investigations' },
    { pageId: 'cases', icon: Shield, title: 'Cases in progress', description: 'Track a case through the workflow', prompt: 'what is the case workflow' },
    { pageId: 'evidence', icon: FolderArchive, title: 'Evidence vault', description: 'Verify chain-of-custody hashes', prompt: 'how do I use evidence vault' },
  ],
  legal: [
    { pageId: 'cases', icon: Shield, title: 'Cases awaiting review', description: 'Rights validation and legal approval queue', prompt: 'what are the four gates' },
    { pageId: 'evidence', icon: FolderArchive, title: 'Evidence vault', description: 'Review evidence before approving rights', prompt: 'how do I use evidence vault' },
    { pageId: 'enforcement', icon: Gavel, title: 'Notices ready to send', description: 'Approve and dispatch takedown notices', prompt: 'how do I use enforcement' },
    { pageId: 'audit', icon: ScrollText, title: 'Audit log', description: 'Full history of approvals and decisions', prompt: 'how do I use audit log' },
  ],
  operations: [
    { pageId: 'enforcement', icon: Gavel, title: 'Submit approved notices', description: "Today's dispatch queue", prompt: 'how do I use enforcement' },
    { pageId: 'radar', icon: Radar, title: 'Reappearance radar', description: 'Confirm detected reappearances', prompt: 'how do I use reappearance radar' },
    { pageId: 'cases', icon: Shield, title: 'Cases awaiting response', description: 'Track platform responses', prompt: 'what is the case workflow' },
    { pageId: 'overview', icon: LayoutDashboard, title: "Today's overview", description: 'Active cases, SLA breaches, top alerts', prompt: 'how do I use overview' },
  ],
  admin: [
    { pageId: 'administration', icon: Settings, title: 'Admin console', description: 'Users, connector health, background jobs', prompt: 'how do I use administration' },
    { pageId: 'configuration', icon: SlidersHorizontal, title: 'Tenant configuration', description: 'SLA rules, platforms, notice templates', prompt: 'how do I use configuration' },
    { pageId: 'audit', icon: ScrollText, title: 'Audit log', description: 'Full history of platform activity', prompt: 'how do I use audit log' },
    { pageId: 'overview', icon: LayoutDashboard, title: "Today's overview", description: 'Active cases, SLA breaches, top alerts', prompt: 'how do I use overview' },
  ],
};

function quickStartsFor(role: Role): QuickStart[] {
  const accessible = new Set(PAGE_GUIDES.filter((p) => navAllowed(role, p.roles)).map((p) => p.id));
  const specs = ROLE_QUICK_STARTS[role].filter((s) => accessible.has(s.pageId));

  const items: QuickStart[] = specs.map((s) => ({
    icon: s.icon,
    title: s.title,
    description: s.description,
    prompt: s.prompt,
  }));

  items.push({
    icon: BookOpen,
    title: 'How this platform works',
    description: 'Navigation and the enforcement workflow',
    prompt: 'what is the case workflow',
  });

  return items;
}

/** Decorative discover→investigate→enforce→monitor loop, echoing ClosedLoopDiagram's
 * hand-built SVG style but rendered large and low-opacity as a hero backdrop. */
function LoopGraphic() {
  const nodes = [
    { x: 90, y: 60 }, { x: 260, y: 30 }, { x: 400, y: 90 },
    { x: 420, y: 220 }, { x: 280, y: 270 }, { x: 120, y: 220 },
  ];
  const path = [...nodes, nodes[0]].map((n) => `${n.x},${n.y}`).join(' ');
  return (
    <svg viewBox="0 0 480 300" className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
      <polyline points={path} fill="none" stroke="#0077C8" strokeWidth="1" strokeDasharray="3 5" />
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i === 0 ? 5 : 3.5} fill={i === 0 ? '#D4A017' : '#0077C8'} />
      ))}
    </svg>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api<{ user: SessionUser }>('me')
      .then((d) => setUser(d.user))
      .catch(() => router.push('/'));
  }, [router]);

  if (!user) return null;

  function continueToApp() {
    router.push(destinationForEmail(user!.email));
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D1428' }}>
      <header className="h-14 flex-shrink-0 bg-[#1A1F36]/95 border-b border-white/[0.08] flex items-center gap-3 px-6" style={{ backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src={KPMG_LOGO} alt="KPMG" className="h-5 w-auto object-contain brightness-0 invert opacity-90" />
          <span className="text-white/30">|</span>
          <div className="h-6 px-1.5 rounded bg-white flex items-center">
            <img src={SCHAND_LOGO} alt="S. Chand" className="h-4 w-auto object-contain" />
          </div>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="font-bold text-sm text-white hidden sm:inline" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Anti-Piracy Command Center
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-white/60">
          Signed in as <span className="text-white font-semibold">{ROLE_LABEL[user.role]}</span>
        </span>
        <button
          onClick={async () => {
            await post('auth/logout');
            router.push('/');
          }}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors pl-3 ml-1 border-l border-white/10"
          title="Sign out"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <div className="lg:col-span-3 relative flex flex-col justify-center px-2">
          <LoopGraphic />
          <div className="relative">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Anti-piracy enforcement,<br /><span className="text-[#0077C8]">at your fingertips</span>
            </h1>
            <p className="text-white/80 mt-5 max-w-md text-sm leading-relaxed">
              A closed-loop IP protection operating platform — discovery, evidence, human governance, legal controls, enforcement orchestration, reappearance intelligence and LLM exposure monitoring.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 text-xs max-w-md">
              {PILLARS.map((s) => (
                <div key={s} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white font-medium">{s}</div>
              ))}
            </div>
            <button
              onClick={continueToApp}
              className="mt-9 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #00338D, #0077C8)' }}
            >
              Enter Command Center
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] overflow-hidden flex flex-col" style={{ height: '620px', maxHeight: '85vh' }}>
          <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00338D, #0077C8)' }}>
                <Bot size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#1A1F36]">K.Bot</div>
                <div className="text-[10px] text-[#9CA3AF]">Welcome, {user.name} · your platform guide</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_ORDER.map((r) => {
                const active = r === user.role;
                return (
                  <span
                    key={r}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                      active
                        ? 'bg-[#00338D] text-white border-[#00338D]'
                        : 'bg-[#F4F6F9] text-[#9CA3AF] border-[#E2E8F0]'
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ChatThread
              user={{ name: user.name, role: user.role }}
              pathname="/welcome"
              quickStarts={quickStartsFor(user.role)}
              bubbleMaxWidth="max-w-[85%]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
