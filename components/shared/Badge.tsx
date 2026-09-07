'use client';

const colors: Record<string, string> = {
  blue:  'bg-[#0077C8]/10 text-[#0077C8] border-[#0077C8]/20',
  navy:  'bg-[#00338D]/10 text-[#00338D] border-[#00338D]/20',
  green: 'bg-[#00A36C]/10 text-[#00A36C] border-[#00A36C]/20',
  amber: 'bg-[#D4A017]/10 text-[#D4A017] border-[#D4A017]/20',
  red:   'bg-red-50 text-red-600 border-red-200',
  grey:  'bg-[#F4F6F9] text-[#6B7280] border-[#E2E8F0]',
};

const sizes: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export function Badge({ children, color = 'blue', size = 'sm', className = '' }: {
  children: React.ReactNode; color?: keyof typeof colors; size?: keyof typeof sizes; className?: string;
}) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-md border ${colors[color] ?? colors.blue} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

const dotColors: Record<string, string> = { green: '#00A36C', amber: '#D4A017', blue: '#0077C8', red: '#DC2626', grey: '#9CA3AF' };

export function StatusBadge({ label, status = 'blue' }: { label: string; status?: keyof typeof dotColors }) {
  return (
    <Badge color={status === 'green' ? 'green' : status === 'red' ? 'red' : status === 'amber' ? 'amber' : status === 'grey' ? 'grey' : 'blue'}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: dotColors[status] ?? dotColors.blue }} />
      {label}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { color: keyof typeof colors; label: string }> = {
    critical: { color: 'red', label: 'Critical' },
    high: { color: 'amber', label: 'High' },
    medium: { color: 'blue', label: 'Medium' },
    low: { color: 'grey', label: 'Low' },
  };
  const m = map[risk] ?? map.medium;
  return <Badge color={m.color}>{m.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <RiskBadge risk={priority} />;
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <Badge color="navy">{platform}</Badge>;
}

export function SlaBadge({ state, label }: { state: string; label?: string }) {
  const color = state === 'breached' ? 'red' : state === 'approaching' ? 'amber' : 'green';
  const text = label ?? (state === 'breached' ? 'SLA Breached' : state === 'approaching' ? 'Approaching SLA' : 'Within SLA');
  return <Badge color={color}>{text}</Badge>;
}
