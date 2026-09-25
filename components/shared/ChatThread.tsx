'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Paperclip, Send } from 'lucide-react';
import { answerQuery, greet } from '@/lib/kbot';
import type { CaseChatContext, SuggestedLink } from '@/lib/kbot';
import { LoadingDots } from '@/components/shared/LoadingDots';
import type { Role } from '@/lib/types';

export interface ChatMessage {
  id: string;
  from: 'user' | 'bot';
  text: string;
  suggestedLinks?: SuggestedLink[];
}

export interface QuickStart {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  prompt: string;
}

let msgSeq = 0;
function nextMsgId() {
  msgSeq += 1;
  return `m${msgSeq}`;
}

/**
 * The reusable core of a K.Bot conversation — message list, typing
 * indicator, input row, and optional quick-start cards shown before the
 * first message is sent. Shared by the floating widget (components/layout/KBot.tsx)
 * and the full-screen welcome-flow chat (app/welcome/page.tsx); each host
 * supplies its own chrome (floating panel vs. full-height card) around this.
 */
export function ChatThread({
  user,
  pathname,
  caseContext,
  quickStarts,
  onLinkClick,
  bubbleMaxWidth = 'max-w-[85%]',
}: {
  user: { name: string; role: Role } | null;
  pathname: string;
  caseContext?: CaseChatContext | null;
  quickStarts?: QuickStart[];
  /** Called after a suggested-link or quick-start navigates, e.g. to close a floating panel. */
  onLinkClick?: () => void;
  bubbleMaxWidth?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (!greeted.current) {
      greeted.current = true;
      setMessages([{ id: nextMsgId(), from: 'bot', text: greet(user, caseContext) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function send(text: string) {
    const trimmed = text.trim();
    const file = attachment;
    if (!trimmed && !file) return;
    if (!user) return;

    const displayText = file ? `${trimmed || 'Sent an attachment'}\n📎 ${file.name}` : trimmed;
    setMessages((m) => [...m, { id: nextMsgId(), from: 'user', text: displayText }]);
    setInput('');
    setAttachment(null);
    setTyping(true);
    setTimeout(() => {
      if (file && !trimmed) {
        setMessages((m) => [
          ...m,
          {
            id: nextMsgId(),
            from: 'bot',
            text: `I can see you attached **${file.name}**, but I can't open or read file contents in this prototype yet — try describing what's in it and I'll help from there.`,
          },
        ]);
        setTyping(false);
        return;
      }
      const reply = answerQuery({
        message: trimmed,
        role: user.role,
        pathname,
        caseContext,
      });
      setMessages((m) => [...m, { id: nextMsgId(), from: 'bot', text: reply.text, suggestedLinks: reply.suggestedLinks }]);
      setTyping(false);
    }, 350);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
    e.target.value = '';
  }

  function goTo(href: string) {
    router.push(href);
    onLinkClick?.();
  }

  const showQuickStarts = quickStarts && quickStarts.length > 0 && messages.length <= 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.from === 'bot' && (
              <div className="w-6 h-6 rounded-md bg-[#00338D] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div className={bubbleMaxWidth}>
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
                      onClick={() => goTo(link.href)}
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

        {showQuickStarts && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Quick starts</div>
            <div className="space-y-1.5">
              {quickStarts!.map((qs) => (
                <button
                  key={qs.title}
                  onClick={() => send(qs.prompt)}
                  className="w-full flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] px-3 py-2 text-left hover:border-[#0077C8]/40 hover:bg-[#0077C8]/[0.03] transition-colors"
                >
                  <span className="w-7 h-7 rounded-md bg-[#0077C8]/10 text-[#0077C8] flex items-center justify-center flex-shrink-0">
                    <qs.icon size={13} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[#1A1F36]">{qs.title}</span>
                    <span className="block text-[10px] text-[#6B7280] truncate">{qs.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-[#E2E8F0] p-3">
        {attachment && (
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-[#00338D] bg-[#0077C8]/[0.06] border border-[#0077C8]/20 rounded-md px-2 py-1 w-fit">
            <Paperclip size={11} />
            <span className="max-w-[180px] truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-[#9CA3AF] hover:text-[#1A1F36] ml-1">
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach a file"
            className="w-9 h-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#6B7280] hover:text-[#00338D] hover:border-[#0077C8]/40 flex-shrink-0 transition-colors"
          >
            <Paperclip size={14} />
          </button>
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
      </div>
    </div>
  );
}
