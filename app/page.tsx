'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import { Button } from '@/components/shared/Button';
import { DEMO_PASSWORD, SCHAND_LOGO } from '@/lib/constants';

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
      router.push('/welcome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0D1428' }}>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 px-2 rounded-lg bg-white border border-[#E2E8F0] flex items-center">
            <img src={SCHAND_LOGO} alt="S. Chand" className="h-6 w-auto object-contain" />
          </div>
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
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mt-6 mb-2">Sign in as</div>
        <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
          {PERSONAS.map((p, i) => {
            const active = p.email === email;
            return (
              <button
                key={p.email}
                onClick={() => {
                  setEmail(p.email);
                  void login(p.email);
                }}
                className={`relative w-full flex items-center gap-2.5 text-left px-3 py-2.5 text-xs transition-colors duration-150 ${
                  i > 0 ? 'border-t border-[#E2E8F0]' : ''
                } ${active ? 'bg-[#00338D]/[0.04]' : 'hover:bg-[#F4F6F9]'}`}
              >
                {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00338D]" />}
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-[#00338D]' : 'bg-[#E2E8F0]'}`} />
                <span className={`font-semibold ${active ? 'text-[#00338D]' : 'text-[#1A1F36]'}`}>{p.role}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#6B7280] mt-4">Shared demo password: {DEMO_PASSWORD}</p>
      </div>
    </div>
  );
}
