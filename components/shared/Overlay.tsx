'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export function Toast({ message, onDone }: { message: string; onDone?: () => void }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[80] bg-[#1A1F36] text-white text-sm px-4 py-3 rounded-xl border border-white/10 shadow-lg">
      {message}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-[#0D1428]/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1A1F36]">{title}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] text-sm">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * A larger, animated drill-down dialog for "double-click a tile/chart for
 * more detail" interactions — a heavier-weight sibling to `Modal`, used
 * when the body includes a chart or a richer breakdown rather than a short
 * confirmation. Dims + blurs the rest of the screen, pops in with a subtle
 * scale/fade, and supports Escape-to-close in addition to backdrop click.
 */
export function DetailModal({
  title,
  subtitle,
  summary,
  children,
  onClose,
  width = 'max-w-3xl',
}: {
  title: string;
  subtitle?: string;
  /** A short, plain-English explanation of what this drill-down shows and why it matters — rendered as a highlighted callout above the chart/breakdown. */
  summary?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[75] bg-[#0D1428]/60 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      >
        <motion.div
          className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl overflow-hidden`}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-base font-bold text-[#1A1F36]">{title}</h3>
              {subtitle && <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1F36] hover:bg-[#F4F6F9] transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-4">
            {summary && (
              <div className="rounded-xl border border-[#0077C8]/20 bg-[#0077C8]/5 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#00338D] mb-1">Summary</div>
                <p className="text-sm text-[#1A1F36] leading-relaxed">{summary}</p>
              </div>
            )}
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Drawer({ title, children, onClose, width = 'w-[520px]' }: {
  title: string; children: React.ReactNode; onClose: () => void; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-[#0D1428]/40" onClick={onClose} />
      <div className={`relative ${width} max-w-full h-full bg-white border-l border-[#E2E8F0] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1A1F36]">{title}</h3>
          <button onClick={onClose} className="text-xs text-[#6B7280]">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">{children}</div>;
}

export function SyntheticBanner({ text = 'Synthetic / Demonstration Data' }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#D4A017]/30 bg-[#FFFBEB] text-[10px] font-bold uppercase tracking-widest text-[#D4A017]">
      {text}
    </div>
  );
}
