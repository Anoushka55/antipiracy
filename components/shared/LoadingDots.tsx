'use client';

export function LoadingDots({ color = '#0077C8', size = 8 }: { color?: string; size?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="typing-dot rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
      ))}
    </div>
  );
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#0077C8]/30 border-t-[#0077C8] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6B7280] text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm font-semibold text-[#1A1F36]">{title}</p>
      <p className="text-xs text-[#6B7280] mt-1">{body}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-xl border border-red-200 bg-[#FEF2F2] text-sm text-red-700">{message}</div>
  );
}
