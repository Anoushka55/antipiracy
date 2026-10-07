'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FolderArchive,
  Gavel,
  LayoutDashboard,
  Radar,
  Settings,
  Shield,
  SlidersHorizontal,
  BarChart3,
  Users,
  ScrollText,
  LogOut,
  Bot,
  Network,
  Scale,
  FileText,
} from 'lucide-react';
import { NAV_GROUPS, ROLE_LABEL, KPMG_LOGO, SCHAND_LOGO } from '@/lib/constants';
import { navAllowed } from '@/lib/rbac';
import { api, post } from '@/lib/client';
import type { Role, SessionUser } from '@/lib/types';
import KBot from '@/components/layout/KBot';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  architecture: Network,
  overview: LayoutDashboard,
  analytics: BarChart3,
  reports: ScrollText,
  discovery: FileSearch,
  investigations: Briefcase,
  cases: Shield,
  evidence: FolderArchive,
  enforcement: Gavel,
  radar: Radar,
  legal: Scale,
  notices: FileText,
  catalogue: BookOpen,
  entities: Users,
  llm: Bot,
  configuration: SlidersHorizontal,
  administration: Settings,
  audit: ScrollText,
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api<{ user: SessionUser; demoMode: boolean }>('me')
      .then((d) => {
        setUser(d.user);
      })
      .catch(() => router.push('/'));
  }, [router]);

  const groups = useMemo(() => {
    if (!user) return [];
    return NAV_GROUPS.filter((g) => navAllowed(user.role as Role, g.roles))
      .map((g) => ({ ...g, items: g.items.filter((item) => navAllowed(user.role as Role, item.roles ?? g.roles)) }))
      .filter((g) => g.items.length > 0);
  }, [user]);

  async function signOut() {
    await post('auth/logout');
    router.push('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F9]">
      <aside className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-[#0A1F4D] border-r border-white/[0.06] flex flex-col transition-all duration-300 overflow-hidden h-full`}>
        <div className="px-3 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <img src={KPMG_LOGO} alt="KPMG" className="h-4 w-auto object-contain brightness-0 invert opacity-90 flex-shrink-0" />
            {!collapsed && <span className="text-white/30 text-xs">|</span>}
            <div className="h-7 px-1.5 rounded bg-white flex items-center flex-shrink-0">
              <img src={SCHAND_LOGO} alt="S. Chand" className="h-4 w-auto object-contain" />
            </div>
          </div>
          {!collapsed && (
            <div className="text-white/50 text-[10px] font-semibold mt-2 font-heading">Anti-Piracy Command Center</div>
          )}
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
          {groups.map((group, gi) => (
            <div key={group.label || `group-${gi}`}>
              {!collapsed && group.label && (
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
        <div className="border-t border-white/[0.06] px-2 py-3 space-y-2">
          {user && (
            <div className={`flex items-center gap-2 px-1 ${collapsed ? 'justify-center' : ''}`}>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white font-semibold truncate">{user.name}</div>
                  <div className="text-[10px] text-white/50 truncate">{ROLE_LABEL[user.role]}</div>
                </div>
              )}
              <button
                onClick={signOut}
                title="Sign out"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white flex-shrink-0 transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <KBot user={user ? { name: user.name, role: user.role as Role } : null} pathname={pathname} />
    </div>
  );
}
