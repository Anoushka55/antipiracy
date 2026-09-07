'use client';

import { useEffect, useState } from 'react';

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
