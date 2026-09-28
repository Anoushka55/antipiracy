'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight, Lightbulb, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { LoadingDots } from '@/components/shared/LoadingDots';
import type { KpiDrilldown, KpiKey, KpiTone } from '@/lib/analytics';

const TONE: Record<KpiTone, string> = {
  red: 'bg-red-50 text-red-600 border-red-200',
  amber: 'bg-[#D4A017]/10 text-[#9A7412] border-[#D4A017]/25',
  blue: 'bg-[#0077C8]/10 text-[#0077C8] border-[#0077C8]/20',
  grey: 'bg-[#F4F6F9] text-[#6B7280] border-[#E2E8F0]',
  green: 'bg-[#00A36C]/10 text-[#00A36C] border-[#00A36C]/20',
};

/**
 * Body of a KPI drill-down modal: one computed insight, the few records behind
 * the number, and shortcuts to the full filtered list. Content comes from
 * kpiDrilldown() in lib/analytics.ts, so every count matches the list it links to.
 */
export function KpiDrilldownPanel({ kpi, onNavigate }: { kpi: KpiKey; onNavigate?: () => void }) {
  const { data, loading, error } = useApi<KpiDrilldown>(`kpi-detail?kpi=${kpi}`);

  if (loading || !data) {
    return (
      <div className="py-10 flex justify-center">
        {error ? <p className="text-xs text-[#DC2626]">Could not load the detail: {error}</p> : <LoadingDots />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#0077C8]/20 bg-[#0077C8]/5 px-4 py-3 flex gap-3">
        <Lightbulb size={16} className="text-[#0077C8] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#1A1F36] leading-relaxed">{data.insight}</p>
      </div>

      {(data.trend || data.stats) && (
        <div className="flex flex-wrap items-stretch gap-2">
          {data.trend && <TrendChip trend={data.trend} />}
          {data.stats?.map((s) => (
            <div key={s.label} className="flex-1 min-w-[110px] rounded-xl border border-[#E2E8F0] px-3 py-2">
              <div className="text-sm font-bold font-mono text-[#1A1F36] tabular-nums">{s.value}</div>
              <div className="text-[10px] text-[#9CA3AF] tracking-wide leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">{data.rowsTitle}</div>
        <div className="rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] overflow-hidden">
          {data.rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#F4F6F9] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1A1F36] truncate">{row.title}</div>
                <div className="text-[11px] text-[#6B7280] truncate">{row.subtitle}</div>
              </div>
              {row.badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${TONE[row.badge.tone]}`}>{row.badge.label}</span>
              )}
              {row.metric && <span className="text-xs font-mono text-[#1A1F36] w-20 text-right flex-shrink-0 tabular-nums">{row.metric}</span>}
              <ChevronRight size={14} className="text-[#CBD5E1] group-hover:text-[#00338D] flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link
          href={data.link.href}
          onClick={onNavigate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00338D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0044b8] transition-colors"
        >
          {data.link.label}
          <ArrowRight size={15} />
        </Link>
        {data.secondary && (
          <Link href={data.secondary.href} onClick={onNavigate} className="text-sm font-semibold text-[#00338D] hover:underline">
            {data.secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

/**
 * A real trend badge: current vs. the prior 7-day window, from record
 * timestamps (see windowTrend() in lib/metrics.ts) — never a fabricated
 * week label. changePct is null when the prior window had zero events.
 * Color follows whether a rising count is good news for this metric (more
 * removals: good; more breaches: not), not direction alone.
 */
function TrendChip({ trend }: { trend: NonNullable<import('@/lib/analytics').KpiDrilldown['trend']> }) {
  const Icon = TREND_ICON[trend.direction];
  const isGoodNews = trend.direction === 'flat' ? null : trend.direction === 'up' ? trend.risingIsGood : !trend.risingIsGood;
  const color = isGoodNews === null ? 'text-[#6B7280] bg-[#F4F6F9] border-[#E2E8F0]' : isGoodNews ? 'text-[#00A36C] bg-[#00A36C]/10 border-[#00A36C]/20' : 'text-[#DC2626] bg-red-50 border-red-200';
  return (
    <div className={`flex-1 min-w-[150px] rounded-xl border px-3 py-2 ${color}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={14} />
        <span className="text-sm font-bold font-mono tabular-nums">
          {trend.changePct === null ? 'New' : `${trend.changePct >= 0 ? '+' : ''}${trend.changePct}%`}
        </span>
      </div>
      <div className="text-[10px] tracking-wide leading-tight mt-0.5 opacity-80">
        {trend.current} vs {trend.previous} in the previous {trend.windowLabel.replace('last ', '')}
      </div>
    </div>
  );
}
