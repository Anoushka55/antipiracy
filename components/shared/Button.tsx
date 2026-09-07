'use client';

const variants: Record<string, string> = {
  primary: 'bg-[#c83328] text-white hover:bg-[#a82a22] focus:ring-[#c83328] shadow-sm hover:shadow-md active:scale-[0.98]',
  accent:  'bg-[#111111] text-white hover:bg-[#2a2a2a] focus:ring-[#111111] shadow-sm hover:shadow-md active:scale-[0.98]',
  outline: 'bg-transparent text-[#c83328] border-2 border-[#c83328] hover:bg-[#c83328] hover:text-white focus:ring-[#c83328] active:scale-[0.98]',
  ghost:   'bg-transparent text-[#6B7280] hover:bg-[#F4F6F9] hover:text-[#111111] focus:ring-[#CBD5E1] active:scale-[0.98]',
  danger:  'bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444] shadow-sm active:scale-[0.98]',
  amber:   'bg-[#D4A017] text-white hover:bg-[#b8891a] focus:ring-[#D4A017] shadow-sm active:scale-[0.98]',
  white:   'bg-white text-[#c83328] hover:bg-[#fdf2f1] focus:ring-white shadow-sm active:scale-[0.98]',
  success: 'bg-[#00A36C] text-white hover:bg-[#008c5c] focus:ring-[#00A36C] shadow-sm hover:shadow-md active:scale-[0.98]',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-8 py-4 text-lg',
};

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button', ...props }: {
  children: React.ReactNode; variant?: keyof typeof variants; size?: keyof typeof sizes;
  onClick?: () => void; disabled?: boolean; className?: string; type?: 'button' | 'submit';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const borderless = variant === 'outline' ? '' : 'border-0';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${borderless} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
