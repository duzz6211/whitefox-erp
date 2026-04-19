import type { ReactNode } from 'react';

/* ─── Card ─────────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-card overflow-hidden transition ${
        hoverable ? 'hover:border-slate-300 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
      <div className="font-semibold text-slate-900">{title}</div>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

/* ─── Stats Card ───────────────────────────────────────── */

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const changeColor =
    changeType === 'positive'
      ? 'text-[#28a745]'
      : changeType === 'negative'
      ? 'text-[#dc3545]'
      : 'text-slate-500';

  const ACCENTS: Record<string, string> = {
    blue: 'bg-[#0066cc]/10 text-[#0066cc]',
    green: 'bg-[#28a745]/10 text-[#1b5e20]',
    amber: 'bg-[#ffc107]/15 text-[#8a6100]',
    red: 'bg-[#dc3545]/10 text-[#b01020]',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 hover:shadow-md hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs font-medium text-slate-500">{title}</div>
        {icon && accent && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ACCENTS[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{value}</div>
      {change && <div className={`text-xs mt-2 ${changeColor}`}>{change}</div>}
    </div>
  );
}

/* ─── Status Pill ──────────────────────────────────────── */

type PillTone = 'active' | 'pending' | 'danger' | 'info' | 'neutral' | 'success';

const PILL_STYLES: Record<PillTone, string> = {
  active: 'bg-[#28a745]/15 text-[#1b5e20]',
  success: 'bg-[#28a745]/15 text-[#1b5e20]',
  pending: 'bg-[#ffc107]/20 text-[#8a6100]',
  danger: 'bg-[#dc3545]/15 text-[#b01020]',
  info: 'bg-[#5c9ce6]/20 text-[#0066cc]',
  neutral: 'bg-slate-200 text-slate-700',
};

export function StatusPill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium text-center min-w-[72px] ${PILL_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ─── Button ───────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[#0066cc] text-white hover:bg-[#0056b3] shadow-sm',
  secondary: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300',
  danger: 'bg-[#dc3545] text-white hover:bg-[#b91d2a] shadow-sm',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/* ─── Avatar ───────────────────────────────────────────── */

export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full bg-[#0066cc] text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0)}
    </div>
  );
}

/* ─── Tabs ─────────────────────────────────────────────── */

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto">
      {items.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-5 py-3 text-sm transition border-b-2 -mb-px whitespace-nowrap ${
            value === t.value
              ? 'border-[#0066cc] text-[#0066cc] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
