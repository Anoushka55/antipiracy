'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FolderArchive,
  Gavel,
  LayoutDashboard,
  Radar,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  BarChart3,
  Users,
  ScrollText,
  LogOut,
  Bot,
} from 'lucide-react';
import { NAV_GROUPS, ROLE_LABEL, SCHAND_LOGO } from '@/lib/constants';
import { navAllowed } from '@/lib/rbac';
import { api, post } from '@/lib/client';
import type { Role, SessionUser } from '@/lib/types';
import { SyntheticBanner } from '@/components/shared/Overlay';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  overview: LayoutDashboard,
  analytics: BarChart3,
  reports: ScrollText,
  discovery: FileSearch,
  investigations: Briefcase,
  cases: Shield,
  evidence: FolderArchive,
  enforcement: Gavel,
  radar: Radar,
  catalogue: BookOpen,
  entities: Users,
  llm: Bot,
  configuration: SlidersHorizontal,
  administration: Settings,
  audit: ScrollText,
};

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Overview',
  '/discovery': 'Discovery',
  '/investigations': 'Investigations',
  '/cases': 'Cases',
  '/evidence': 'Evidence Vault',
  '/enforcement': 'Enforcement',
  '/radar': 'Reappearance Radar',
  '/catalogue': 'Catalogue',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/configuration': 'Configuration',
  '/administration': 'Administration',
  '/audit': 'Audit Log',
  '/entities': 'Repeat Offenders',
  '/llm-probing': 'LLM Exposure',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Record<string, { id: string; title?: string; name?: string; suspectedTitle?: string }[]> | null>(null);
  const [notes, setNotes] = useState<{ id: string; title: string; unread?: boolean; read?: boolean }[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    api<{ user: SessionUser; demoMode: boolean }>('me')
      .then((d) => {
        setUser(d.user);
        setDemoMode(d.demoMode);
      })
      .catch(() => router.push('/'));
    api<{ items: { id: string; title: string; read: boolean }[] }>('notifications').then((d) => setNotes(d.items ?? []));
  }, [router]);

  useEffect(() => {
    if (search.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api<Record<string, { id: string; title?: string; name?: string; suspectedTitle?: string }[]>>(`search?q=${encodeURIComponent(search)}`).then(setResults);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const groups = useMemo(() => {
    if (!user) return [];
    return NAV_GROUPS.filter((g) => navAllowed(user.role as Role, g.roles));
  }, [user]);

  const title = PAGE_TITLES[pathname] ?? (pathname.startsWith('/cases/') ? 'Case' : pathname.startsWith('/catalogue/') ? 'Asset' : 'Command Center');
  const unread = notes.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F9]">
      <aside className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-[#0D1428] border-r border-white/[0.06] flex flex-col transition-all duration-300 overflow-hidden h-full`}>
        <div className="px-3 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="h-8 px-2 rounded bg-white flex items-center flex-shrink-0">
              <img src={SCHAND_LOGO} alt="S. Chand" className="h-5 w-auto object-contain" />
            </div>
            {!collapsed && <div className="text-white/50 text-[10px] font-medium">IP Protection</div>}
          </div>
        </div>
        <div className="flex items-center justify-end px-2 py-2 border-b border-white/[0.06]">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-2 mb-1.5">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.id] ?? LayoutDashboard;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-[#00338D]/25 border border-[#00338D]/30 text-white'
                          : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-[#0077C8]' : 'group-hover:text-white/80'}`} />
                      {!collapsed && <span className="text-xs font-semibold truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] px-2 py-3">
          <div className="flex items-center gap-2 px-2">
            <div className="relative flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#00A36C] block" />
              <span className="absolute inset-0 rounded-full bg-[#00A36C] animate-ping opacity-50" />
            </div>
            {!collapsed && <span className="text-[10px] text-white/40">Prototype systems operational</span>}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex-shrink-0 bg-[#1A1F36]/95 border-b border-white/[0.08] flex items-center gap-3 px-4" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/db/KPMG_blue_logo.svg" alt="KPMG" className="h-5 brightness-0 invert opacity-90" />
            <span className="text-white/30">|</span>
            <div className="h-6 px-1.5 rounded bg-white flex items-center">
              <img src={SCHAND_LOGO} alt="S. Chand" className="h-4 w-auto object-contain" />
            </div>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="font-bold text-sm text-white hidden sm:inline" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Anti-Piracy Command Center
            </span>
          </div>
          <span className="text-white/30">|</span>
          <span className="text-white/70 text-sm hidden lg:inline">{title}</span>

          <div className="flex-1 max-w-xs mx-2 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases, findings, ISBN..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#0077C8]/50 transition-colors"
            />
            {results && (
              <div className="absolute top-9 left-0 right-0 bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-50 p-3 max-h-80 overflow-y-auto">
                {(['cases', 'findings', 'assets', 'evidence', 'entities'] as const).map((g) => (
                  <div key={g} className="mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">{g}</div>
                    {(results[g] ?? []).length === 0 && <div className="text-[11px] text-[#9CA3AF]">None</div>}
                    {(results[g] ?? []).map((r) => (
                      <Link
                        key={r.id}
                        href={g === 'cases' ? `/cases/${r.id}` : g === 'findings' ? `/discovery?id=${r.id}` : g === 'assets' ? `/catalogue/${r.id}` : g === 'evidence' ? `/evidence?id=${r.id}` : `/entities/${r.id}`}
                        className="block text-xs py-1 text-[#00338D] hover:underline"
                        onClick={() => setSearch('')}
                      >
                        {r.id} · {r.title || r.name || r.suspectedTitle}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] text-white/50">Tenant <span className="text-white">S. Chand & Company</span></span>
            <span className="text-white/20">|</span>
            <span className="text-[10px] text-white/50">Environment <span className="text-[#D4A017]">Prototype / Synthetic Data</span></span>
          </div>

          <div className="relative">
            <button onClick={() => setShowNotes((v) => !v)} className="relative w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70">
              <Bell size={14} />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] text-[9px] text-white flex items-center justify-center">{unread}</span>}
            </button>
            {showNotes && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-lg z-50 p-3 max-h-96 overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Notifications</div>
                {notes.slice(0, 12).map((n) => (
                  <div key={n.id} className="text-xs py-2 border-b border-[#E2E8F0] last:border-0 text-[#1A1F36]">{n.title}</div>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-white font-semibold">{user.name}</div>
                <div className="text-[10px] text-white/50">{ROLE_LABEL[user.role]}</div>
              </div>
              <button
                onClick={async () => {
                  await post('auth/logout');
                  router.push('/');
                }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </header>
        {demoMode && (
          <div className="h-8 flex-shrink-0 bg-[#FFFBEB] border-b border-[#D4A017]/20 flex items-center px-4 gap-3">
            <SyntheticBanner text="PROTOTYPE" />
            <SyntheticBanner />
            <span className="text-[11px] text-[#6B7280]">No live scraping, notices or legal filings are performed.</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
