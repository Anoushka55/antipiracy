'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X } from 'lucide-react';
import { api } from '@/lib/client';
import { answerQuery, greet } from '@/lib/kbot';
import type { CaseChatContext, SuggestedLink } from '@/lib/kbot';
import { LoadingDots } from '@/components/shared/LoadingDots';
import type { CaseRecord, FourGates, LegalReview, Role, RightsValidation } from '@/lib/types';

interface ChatMessage {
  id: string;
  from: 'user' | 'bot';
  text: string;
  suggestedLinks?: SuggestedLink[];
}

let msgSeq = 0;
function nextMsgId() {
  msgSeq += 1;
  return `m${msgSeq}`;
}

export default function KBot({ user, pathname }: { user: { name: string; role: Role } | null; pathname: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [caseContext, setCaseContext] = useState<CaseChatContext | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

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

  useEffect(() => {
    if (open && !greeted.current) {
      greeted.current = true;
      setMessages([{ id: nextMsgId(), from: 'bot', text: greet(user, caseContext) }]);
      setPulse(false);
    }
  }, [open, user, caseContext]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  if (!user) return null;

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { id: nextMsgId(), from: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = answerQuery({
        message: trimmed,
        role: user!.role,
        pathname,
        caseContext,
      });
      setMessages((m) => [...m, { id: nextMsgId(), from: 'bot', text: reply.text, suggestedLinks: reply.suggestedLinks }]);
      setTyping(false);
    }, 350);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
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

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.from === 'bot' && (
                    <div className="w-6 h-6 rounded-md bg-[#00338D] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div
                      className={`text-xs px-3 py-2 rounded-xl whitespace-pre-wrap ${
                        m.from === 'user'
                          ? 'bg-[#0077C8] text-white rounded-br-sm'
                          : 'bg-[#F4F6F9] text-[#1A1F36] rounded-bl-sm ai-output'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.suggestedLinks && m.suggestedLinks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.suggestedLinks.map((link) => (
                          <button
                            key={link.href}
                            onClick={() => {
                              router.push(link.href);
                              setOpen(false);
                            }}
                            className="text-[10px] font-semibold px-2 py-1 rounded-full border border-[#0077C8]/30 text-[#00338D] bg-[#0077C8]/[0.06] hover:bg-[#0077C8]/[0.12] transition-colors"
                          >
                            {link.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-md bg-[#00338D] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-[#F4F6F9] rounded-xl rounded-bl-sm px-3 py-2.5">
                    <LoadingDots size={5} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-[#E2E8F0] p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send(input);
                }}
                placeholder="Ask K.Bot anything..."
                className="flex-1 bg-[#F4F6F9] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-[#1A1F36] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0077C8]/50 transition-colors"
              />
              <button
                onClick={() => send(input)}
                className="w-9 h-9 rounded-lg bg-[#00338D] flex items-center justify-center text-white flex-shrink-0 active:scale-[0.98] transition-transform"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
