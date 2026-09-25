'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { api } from '@/lib/client';
import type { CaseChatContext } from '@/lib/kbot';
import { ChatThread } from '@/components/shared/ChatThread';
import type { CaseRecord, FourGates, LegalReview, Role, RightsValidation } from '@/lib/types';

export default function KBot({ user, pathname }: { user: { name: string; role: Role } | null; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [caseContext, setCaseContext] = useState<CaseChatContext | null>(null);

  // Fetch light case context whenever the user is on a /cases/:id page.
  useEffect(() => {
    const match = pathname.match(/^\/cases\/([^/]+)/);
    if (!match) {
      setCaseContext(null);
      return;
    }
    const caseId = match[1];
    let cancelled = false;
    api<{ case: CaseRecord; rights: RightsValidation[]; legal?: LegalReview }>(`case?id=${caseId}`)
      .then((d) => {
        if (cancelled || !d.case) return;
        const gates: FourGates | null = d.rights?.[0]?.gates ?? null;
        setCaseContext({
          caseId: d.case.id,
          status: d.case.status,
          gates,
          legalStatus: d.legal?.status ?? null,
        });
      })
      .catch(() => setCaseContext(null));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setPulse(false);
        }}
        className="fixed bottom-6 right-6 z-[95] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #00338D, #0077C8)' }}
        title="K.Bot — Ask for help"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && pulse && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00A36C]">
            <span className="absolute inset-0 rounded-full bg-[#00A36C] animate-ping opacity-60" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-[96] w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden"
          >
            <div className="flex-shrink-0 bg-[#0D1428] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00338D] flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">K.Bot</div>
                <div className="text-[10px] text-white/50">AI Assistant · Prototype Guide</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <ChatThread user={user} pathname={pathname} caseContext={caseContext} onLinkClick={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
