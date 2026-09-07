'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { DEMO_PASSWORD } from '@/lib/constants';

const PERSONAS = [
  { email: 'sourabh@schand.demo', name: 'Mr. Sourabh', role: 'Executive / CFO' },
  { email: 'murli@schand.demo', name: 'Mr. Murli', role: 'Anti-Piracy Lead' },
  { email: 'inv02@schand.demo', name: 'Enforcement Analyst 02', role: 'Investigator' },
  { email: 'legal@schand.demo', name: 'Legal Reviewer 01', role: 'Legal Reviewer' },
  { email: 'ops@schand.demo', name: 'Platform Operations 01', role: 'Operations' },
  { email: 'b.pradhan@schand.demo', name: 'B. Pradhan', role: 'Technology Admin' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sourabh@schand.demo');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(nextEmail = email) {
    setBusy(true);
    setError('');
    try {
      await post('auth/login', { email: nextEmail, password });
      const dest = nextEmail.startsWith('sourabh')
        ? '/overview'
        : nextEmail.startsWith('inv')
          ? '/discovery'
          : nextEmail.startsWith('legal')
            ? '/cases'
            : nextEmail.startsWith('ops')
              ? '/enforcement'
              : nextEmail.startsWith('b.pradhan')
                ? '/administration'
                : '/overview';
      router.push(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0D1428' }}>
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 px-3 rounded bg-white flex items-center">
              <span className="text-[#00338D] text-xs font-bold tracking-wide">KPMG</span>
            </div>
            <span className="text-white/30">×</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#8B1E3F' }}>
              S
            </div>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/55 mb-3">Client demonstration</div>
          <h1 className="text-4xl font-bold leading-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            S. Chand Anti-Piracy<br />Command Center
          </h1>
          <p className="text-white/80 mt-4 max-w-md text-sm leading-relaxed">
            A closed-loop IP protection operating platform — discovery, evidence, human governance, legal controls, enforcement orchestration, reappearance intelligence and LLM exposure monitoring.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
            {['Discover', 'Investigate', 'Validate', 'Enforce', 'Monitor', 'LLM Probe'].map((s) => (
              <div key={s} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white font-medium">{s}</div>
            ))}
          </div>
          <p className="text-[11px] text-white/60 mt-8">Prototype / Synthetic Data · No live scraping, model calls or legal filings</p>
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold" style={{ backgroundColor: '#8B1E3F' }}>S</div>
            <div>
              <div className="text-sm font-bold text-[#1A1F36]">S. Chand & Company</div>
              <div className="text-[10px] text-[#6B7280]">Tenant SCHAND</div>
            </div>
          </div>
          <h2 className="text-lg font-semibold mt-4 mb-4 text-[#1A1F36]">Sign in</h2>
          <label className="text-xs text-[#6B7280]">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] text-[#1A1F36] focus:outline-none focus:ring-2 focus:ring-[#0077C8]/30" />
          <label className="text-xs text-[#6B7280]">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 mb-4 px-3 py-2 text-sm rounded-lg border border-[#E2E8F0] text-[#1A1F36] focus:outline-none focus:ring-2 focus:ring-[#0077C8]/30" />
          {error && <div className="text-xs text-[#DC2626] mb-3">{error}</div>}
          <Button className="w-full" disabled={busy} onClick={() => login()}>{busy ? 'Signing in…' : 'Enter Command Center'}</Button>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mt-6 mb-2">Demo personas</div>
          <div className="space-y-1.5">
            {PERSONAS.map((p) => (
              <button
                key={p.email}
                onClick={() => {
                  setEmail(p.email);
                  void login(p.email);
                }}
                className="w-full text-left px-3 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#00338D]/30 text-xs transition-all duration-200"
              >
                <div className="font-semibold text-[#1A1F36]">{p.name}</div>
                <div className="text-[#6B7280]">{p.role} · {p.email}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-4">Shared demo password: {DEMO_PASSWORD}</p>
        </div>
      </div>
    </div>
  );
}
