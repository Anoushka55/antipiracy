'use client';

import { useState } from 'react';
import { Check, Copy, Download, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/shared/Badge';
import { LoadingDots } from '@/components/shared/LoadingDots';
import {
  noticeToText,
  noticeToWordHtml,
  ROUTE_FOR_TEMPLATE,
  TEMPLATE_LABEL,
  TODO_PATTERN,
  type NoticeDocument,
  type NoticeTemplateId,
} from '@/lib/notice-templates';
import type { NoticeRoute } from '@/lib/types';

const STATUS_COLOR = { draft: 'amber', approved: 'blue', dispatched: 'green' } as const;
const SPLIT_TODO = new RegExp(`(${TODO_PATTERN.source})`, 'g');
const IS_TODO = new RegExp(`^${TODO_PATTERN.source}$`);

/** Highlights "[To be completed by Legal: …]" markers so Legal can spot what's left. */
function Text({ children }: { children: string }) {
  const parts = children.split(SPLIT_TODO);
  return (
    <>
      {parts.map((part, i) =>
        IS_TODO.test(part) ? (
          <mark key={i} className="bg-[#D4A017]/15 text-[#8A6A0A] rounded px-1 font-medium">{part.replace(/^\[|\]$/g, '')}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * A formal notice letter, built from S. Chand's sample drafts
 * (lib/notice-templates.ts). Includes copy-as-text and download-as-Word.
 */
export function NoticeDocumentView({ doc }: { doc: NoticeDocument }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(noticeToText(doc));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([noticeToWordHtml(doc)], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.noticeId}-${doc.caseId}-${doc.templateId}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="navy"><FileText size={11} className="mr-1" />{doc.templateName}</Badge>
        <Badge color={STATUS_COLOR[doc.status]}>{doc.status[0].toUpperCase() + doc.status.slice(1)}</Badge>
        {doc.openItems > 0 && (
          <Badge color="amber">{doc.openItems} {doc.openItems === 1 ? 'item' : 'items'} for Legal to complete</Badge>
        )}
        <div className="ml-auto flex gap-1.5">
          <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#1A1F36] hover:bg-[#F4F6F9]">
            {copied ? <Check size={13} className="text-[#00A36C]" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button onClick={download} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#00338D] text-white hover:bg-[#0044b8]">
            <Download size={13} />
            Download (.doc)
          </button>
        </div>
      </div>

      <article className="rounded-xl border border-[#E2E8F0] bg-white px-7 py-6 text-[13px] leading-relaxed text-[#1A1F36] shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Subject</div>
        <h2 className="text-[15px] font-bold text-[#00338D] leading-snug font-heading">{doc.subject}</h2>

        <p className="mt-5">{doc.salutation}</p>
        <div className="mt-3 space-y-2.5">
          {doc.intro.map((p, i) => (
            <p key={i} className={p.startsWith('Re:') ? 'font-semibold' : ''}><Text>{p}</Text></p>
          ))}
        </div>

        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-5">
            <h3 className="text-[13px] font-bold text-[#1A1F36] border-b border-[#E2E8F0] pb-1 mb-2 font-heading">{s.heading}</h3>
            <div className="space-y-2">
              {s.paragraphs?.map((p, i) => <p key={`p${i}`}><Text>{p}</Text></p>)}
              {s.fields && (
                <dl className="grid grid-cols-[minmax(150px,auto)_1fr] gap-x-4 gap-y-1">
                  {s.fields.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="text-[#6B7280]">{f.label}</dt>
                      <dd className="break-words"><Text>{f.value}</Text></dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.bullets && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.bullets.map((b, i) => <li key={i}><Text>{b}</Text></li>)}
                </ul>
              )}
              {s.after?.map((p, i) => <p key={`a${i}`}><Text>{p}</Text></p>)}
            </div>
          </section>
        ))}

        {doc.closing.length > 0 && (
          <div className="mt-5 space-y-2">{doc.closing.map((p, i) => <p key={i}>{p}</p>)}</div>
        )}

        <dl className="mt-5 grid grid-cols-[minmax(150px,auto)_1fr] gap-x-4 gap-y-0.5 text-[12px]">
          {doc.references.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-[#6B7280]">{r.label}</dt>
              <dd className="font-mono">{r.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5">{doc.signOff}</p>
        <div className="mt-2">
          <div className="font-bold">{doc.signature.name}</div>
          <div>{doc.signature.title}</div>
          <div>For and on behalf of {doc.signature.company}</div>
          <div className="text-[#6B7280] text-[12px] mt-1">{doc.signature.email} · {doc.signature.telephone}</div>
          <div className="text-[#6B7280] text-[12px]">{doc.signature.address}</div>
        </div>
      </article>
    </div>
  );
}

/** Fetches and renders a notice. `version` forces a refetch after a redraft or approval. */
export function NoticeDocumentLoader({ noticeId, version }: { noticeId: string; version?: string }) {
  const { data, loading, error } = useApi<NoticeDocument>(`notice-document?id=${encodeURIComponent(noticeId)}&v=${encodeURIComponent(version ?? '')}`);
  if (error) return <p className="text-xs text-[#DC2626]">Could not load the notice: {error}</p>;
  if (loading || !data) return <div className="py-8 flex justify-center"><LoadingDots /></div>;
  return <NoticeDocumentView doc={data} />;
}

/** Picks which of the four sample templates a draft is written from. */
export function NoticeTemplatePicker({ route, disabled, onChange }: { route: NoticeRoute; disabled?: boolean; onChange: (route: NoticeRoute) => void }) {
  const current = (Object.keys(ROUTE_FOR_TEMPLATE) as NoticeTemplateId[]).find((t) => ROUTE_FOR_TEMPLATE[t] === route)
    ?? (route === 'registrar_hosting' ? 'escalated' : 'copyright_reporting');
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-[#6B7280] font-semibold">Template</span>
      <select
        value={current}
        disabled={disabled}
        onChange={(e) => onChange(ROUTE_FOR_TEMPLATE[e.target.value as NoticeTemplateId])}
        className="text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-[#1A1F36] disabled:opacity-50"
      >
        {(Object.keys(TEMPLATE_LABEL) as NoticeTemplateId[]).map((t) => (
          <option key={t} value={t}>{TEMPLATE_LABEL[t]}</option>
        ))}
      </select>
    </label>
  );
}
