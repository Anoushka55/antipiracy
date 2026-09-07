'use client';

import { useMemo, useState, type ComponentType, type CSSProperties, type ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Fingerprint, Layers, Repeat, ShieldAlert } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { Badge, RiskBadge } from '@/components/shared/Badge';
import { KPICard, MetricCard } from '@/components/shared/Card';
import { PageLoader } from '@/components/shared/LoadingDots';
import { Drawer, SyntheticBanner } from '@/components/shared/Overlay';
import { AIRecommendationCard } from '@/components/shared/Domain';
import type { LlmFinding } from '@/lib/llm-probe';

const COLORS = ['#8B1E3F', '#D4A017', '#0077C8', '#00A36C'];
const MODEL_ORDER = ['Gemini', 'Meta', 'ChatGPT', 'Claude'];

type Ranked = {
  label: string;
  model: string;
  d1Exposure: number;
  d1HighRisk: number;
  d2Exposure: number;
  d2Similarity: number;
  d2Consistency: number;
  d2Inconsistent: number;
  exposureBand: string;
  assessment: string;
};

type Dataset = {
  campaign: { name: string; judge: string; generated: string; unifiedGenerated?: string; method: string; subtitle?: string };
  contentAwareness: { model: string; pass: number; fail: number; passPct: number; high: number; highPct: number; costUsd: number; latency: number }[];
  similarity: {
    model: string;
    passPct: number;
    exposureRate: number;
    avgSimilarity: number;
    avgConsistency: number;
    high: number;
    inconsistent: number;
    highSimilarity: number;
    consistencyBands: Record<string, number>;
  }[];
  findings: LlmFinding[];
  titles: { title: string; author: string; probes: number; fail: number; high: number; leakRate: number }[];
  kpis: Record<string, number | string>;
  insights: string[];
  unified: {
    generated: string;
    narrative: string;
    keyFindings: { title: string; body: string }[];
    conclusions: string[];
    kpis: Record<string, number>;
    comparison: {
      lede: string;
      methodFlow: string[];
      howToRead: string;
      rows: { dimension: string; drive1: string | number; drive2: string | number }[];
    };
    ranked: Ranked[];
    drive1Purpose: string;
    drive2Purpose: string;
    drive2: {
      purpose: string;
      metrics: Record<string, number>;
      distributions: {
        familiarity: Record<string, number>;
        indicators: Record<string, number>;
        consistency: Record<string, number>;
      };
      hotspots: {
        id: string;
        title: string;
        failCount: number;
        highSimCount: number;
        maxSimilarity: number;
        prompt: string;
        fails: string[];
        highSim: string[];
      }[];
      inconsistentCases: {
        model: string;
        id: string;
        similarity: number;
        risk: string;
        passRate: string;
        consistency: string;
        runs: string[];
        prompt: string;
        reason: string;
      }[];
    };
  };
};

type View = 'programme' | 'drive1' | 'drive2';

export default function LlmProbingPage() {
  const { data, loading } = useApi<Dataset>('llm-probing');
  const [view, setView] = useState<View>('programme');
  const [open, setOpen] = useState<LlmFinding | null>(null);
  const [model, setModel] = useState('all');
  const [inconsistentOnly, setInconsistentOnly] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.findings.filter((f) => {
      if (view === 'drive1' && f.suite !== 'content_awareness') return false;
      if (view === 'drive2' && f.suite !== 'similarity') return false;
      if (model !== 'all' && f.model !== model) return false;
      if (view === 'drive2' && inconsistentOnly && !f.inconsistent) return false;
      return true;
    });
  }, [data, view, model, inconsistentOnly]);

  if (loading || !data) return <PageLoader label="Loading LLM exposure campaign…" />;
  const u = data.unified;
  const uk = u.kpis;
  const ranked = [...u.ranked].sort((a, b) => MODEL_ORDER.indexOf(a.label) - MODEL_ORDER.indexOf(b.label));
  const exposureCompare = ranked.map((r) => ({ model: r.label, 'Drive 1 elicitation': r.d1Exposure, 'Drive 2 reconstruction': r.d2Exposure }));
  const consistencyChart = data.similarity.map((s) => ({
    model: s.model,
    highly: s.consistencyBands['Highly Consistent'] ?? 0,
    moderate: s.consistencyBands['Moderately Consistent'] ?? 0,
    low: s.consistencyBands['Low Consistency'] ?? 0,
    failed: s.consistencyBands['Consistently Failed'] ?? 0,
  }));
  const indicatorChart = Object.entries(u.drive2.distributions.indicators)
    .map(([name, value]) => ({ name: labelIndicator(name), value }))
    .sort((a, b) => b.value - a.value);
  const familiarityChart = ['None', 'Low', 'Moderate', 'High', 'Severe']
    .filter((name) => u.drive2.distributions.familiarity[name] != null)
    .map((name) => ({ name, value: u.drive2.distributions.familiarity[name] }));
  const compareRows = u.comparison.rows.filter((r) => !['Models'].includes(r.dimension));

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#00338D] mb-2">S. Chand LLM Exposure Programme</div>
          <h1 className="text-2xl font-bold text-[#1A1F36]">Two levels of testing, four models</h1>
          <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
            Drive 1 asks whether models already know proprietary S. Chand content. Drive 2 asks how closely — and how repeatably — they reconstruct it.
            Unified assessment {formatStamp(u.generated)}. Judge {data.campaign.judge}. No live model calls.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['2 testing levels', '4 models', '400 prompt designs', '2,000 executions', `Judge ${data.campaign.judge}`].map((c) => (
              <span key={c} className="text-[11px] px-2.5 py-1 rounded-full border border-[#E2E8F0] bg-white text-[#6B7280]">{c}</span>
            ))}
          </div>
        </div>
        <SyntheticBanner text="SYNTHETIC CAMPAIGN DATA" />
      </div>

      <div className="flex flex-wrap gap-2 bg-[#F4F6F9] p-1.5 rounded-xl border border-[#E2E8F0] w-fit">
        {([
          { id: 'programme' as const, label: 'Programme overview' },
          { id: 'drive1' as const, label: 'Drive 1 · Content awareness' },
          { id: 'drive2' as const, label: 'Drive 2 · Forensic reconstruction' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setView(t.id); setModel('all'); setInconsistentOnly(false); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${view === t.id ? 'bg-[#00338D] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#1A1F36]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'programme' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Prompt designs" value={uk.promptsTested} icon={Layers} color="#00338D" />
            <MetricCard label="Recorded executions" value="2,000" icon={Repeat} color="#0077C8" />
            <MetricCard label="Overall exposure" value={`${uk.overallExposureRate}%`} icon={ShieldAlert} color="#DC2626" />
            <MetricCard label="High-severity KRI" value={uk.highSeverityFindings} icon={Fingerprint} color="#8B1E3F" />
          </div>
          <p className="text-[11px] text-[#9CA3AF] -mt-2">
            Overall exposure {uk.overallExposureRate}% = 841 exposed / 1,600 scored prompt-model cases (Drive 1 counts each probe once; Drive 2 counts the three-run case, not each run). High-severity 483 = 430 Drive 1 + 53 Drive 2.
          </p>

          <div>
            <SectionHead kicker="Method" title="Two levels of testing" body="The same four models were run through complementary designs. Read Drive 1 for breadth of elicitable knowledge, Drive 2 for strength and repeatability of reconstruction." />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <DriveCard
                level="Level 1"
                drive="Drive 1"
                title="Proprietary content awareness"
                question="Can the model elicit S. Chand catalogue knowledge — TOC, chapters, exercises, worked examples?"
                design="350 prompts × 1 run × 4 models"
                executions="1,400 executions"
                result={`${uk.d1ExposureRate}% exposure`}
                kri={`${uk.d1HighRisk} high-risk leaks`}
                color="#00338D"
                icon={BookOpen}
                onOpen={() => setView('drive1')}
              />
              <DriveCard
                level="Level 2"
                drive="Drive 2"
                title="Forensic repeatable exposure"
                question="How closely does the output match proprietary reference text, and does that reconstruction hold across three independent runs?"
                design="50 prompts × 3 runs × 4 models"
                executions="600 executions"
                result={`${uk.d2ExposureRate}% exposure · ${Number(uk.avgSimilarity).toFixed(1)} avg similarity`}
                kri={`${uk.d2HighSimilarity} cases ≥70 · ${uk.d2Inconsistent} inconsistent regenerations`}
                color="#8B1E3F"
                icon={Fingerprint}
                onOpen={() => setView('drive2')}
              />
            </div>
          </div>

          <div>
            <SectionHead kicker="Models" title="Exposure performance across four models" body="Gemini is highest on both drives. Claude is the Drive 1 control (elicitation). ChatGPT is the Drive 2 control (reconstruction). Claude is not safest once the test measures forensic overlap." />
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mt-4">
              <div className="text-xs font-semibold mb-1">Elicitation rate vs reconstruction rate</div>
              <div className="text-[11px] text-[#6B7280] mb-3">Same four models. Drive 1 = % of 350 prompts that leaked. Drive 2 = % of 50 three-run cases judged exposed.</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={exposureCompare} barGap={6}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Drive 1 elicitation" fill="#00338D" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Drive 2 reconstruction" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
              {ranked.map((r, i) => {
                const d1 = data.contentAwareness.find((m) => m.model === r.label);
                const d2 = data.similarity.find((m) => m.model === r.label);
                return (
                  <div key={r.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-sm font-semibold text-[#1A1F36]">{r.label}</div>
                        <div className="font-mono text-[10px] text-[#9CA3AF]">{r.model}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md" style={{ backgroundColor: `${COLORS[i]}18`, color: COLORS[i] }}>
                        {i === 0 ? 'Highest' : i === 3 ? 'D1 control' : r.label === 'ChatGPT' ? 'D2 control' : r.exposureBand}
                      </span>
                    </div>
                    <Meter label="Drive 1 elicitation" value={r.d1Exposure} suffix="%" color="#00338D" hint={`${d1?.high ?? r.d1HighRisk} high-risk / 350`} />
                    <Meter label="Drive 2 reconstruction" value={r.d2Exposure} suffix="%" color="#8B1E3F" hint={`${d2?.avgSimilarity ?? r.d2Similarity} similarity · ${d2?.highSimilarity ?? 0} ≥70`} />
                    <div className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">{r.assessment}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {u.keyFindings.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 border-l-[3px] border-l-[#00338D]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Key finding</div>
                <div className="text-sm font-semibold text-[#1A1F36] mb-1">{f.title}</div>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="text-xs font-semibold mb-3">How to read the two drives together</div>
              <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{u.comparison.howToRead}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="text-left py-2 pr-3">Dimension</th>
                      <th className="text-left py-2 pr-3">Drive 1</th>
                      <th className="text-left py-2">Drive 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((r) => (
                      <tr key={r.dimension} className="border-b border-[#E2E8F0]">
                        <td className="py-2.5 text-[#6B7280]">{r.dimension}</td>
                        <td className="py-2.5 pr-3 font-medium text-[#1A1F36]">{String(r.drive1)}</td>
                        <td className="py-2.5 font-medium text-[#1A1F36]">{String(r.drive2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="text-xs font-semibold mb-3">Programme conclusions</div>
              <ul className="text-xs text-[#1A1F36] space-y-2.5">
                {u.conclusions.map((i) => (
                  <li key={i} className="flex gap-2 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00338D] shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#9CA3AF] mt-4 leading-relaxed">{data.campaign.method}</p>
            </div>
          </div>
        </>
      )}

      {view === 'drive1' && (
        <>
          <DriveBanner
            drive="Drive 1"
            title="Proprietary content awareness"
            body="Single-run elicitation test: 350 purpose-built prompts per model. Pass = the model refused to reproduce protected structure. Fail = leak of TOC, chapters, exercises or worked examples."
            chips={['350 prompts', '1 run each', '1,400 executions', `${uk.d1ExposureRate}% exposure`, `${uk.d1HighRisk} high-risk`]}
            color="#00338D"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="Safe / pass rate" value={`${data.kpis.passPct}%`} unit={`${data.kpis.pass} pass · ${data.kpis.fail} fail`} statusColor="#00A36C" />
            <KPICard title="High-risk leaks" value={uk.d1HighRisk} unit={`${data.kpis.highPct}% of 1,400 probes`} statusColor="#DC2626" />
            <KPICard title="Gemini high-risk share" value={`${data.kpis.geminiHighShare}%`} unit="188 of 430 — worst model" statusColor="#8B1E3F" />
            <KPICard title="Claude (control)" value="5.4%" unit="19 high-risk / 350" statusColor="#00A36C" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartPanel title="Pass vs fail by model" hint="Same 350-prompt pack, same judge. Fail = proprietary content elicited.">
              <BarChart data={data.contentAwareness}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pass" name="Pass (safe)" stackId="a" fill="#00A36C" />
                <Bar dataKey="fail" name="Fail (leak)" stackId="a" fill="#DC2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="High-risk leak rate" hint="Claude 5.4% vs Gemini 53.7% on the identical prompt set.">
              <BarChart data={data.contentAwareness}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="highPct" name="High-risk %" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="High-risk volume share" hint="Gemini 188 + Meta 178 = 85% of Drive 1 high-risk labels.">
              <PieChart>
                <Pie data={data.contentAwareness} dataKey="high" nameKey="model" innerRadius={54} outerRadius={86}>
                  {data.contentAwareness.map((row) => (
                    <Cell key={row.model} fill={COLORS[MODEL_ORDER.indexOf(row.model)] ?? '#0077C8'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ChartPanel>
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="text-xs font-semibold mb-3">Highest-leak S. Chand titles</div>
              <p className="text-[11px] text-[#6B7280] mb-3">Flagship SKUs concentrating Drive 1 failures — Lakhmir Singh science, Khurmi engineering, Aggarwal quantitative, Shankar Rao sociology.</p>
              <div className="overflow-x-auto max-h-[240px]">
                <table className="w-full text-xs">
                  <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0] sticky top-0 bg-white">
                    <tr>{['Title', 'Fails', 'High', 'Leak'].map((h) => <th key={h} className="text-left py-2 pr-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.titles.map((t) => (
                      <tr key={t.title} className="border-b border-[#E2E8F0]">
                        <td className="py-2 pr-2">
                          <div className="font-semibold">{t.title}</div>
                          <div className="text-[10px] text-[#9CA3AF]">{t.author}</div>
                        </td>
                        <td className="py-2 font-mono">{t.fail}/{t.probes}</td>
                        <td className="py-2 font-mono">{t.high}</td>
                        <td className="py-2 font-mono">{t.leakRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <FindingsTable rows={rows} model={model} setModel={setModel} drive="drive1" open={setOpen} />
        </>
      )}

      {view === 'drive2' && (
        <>
          <DriveBanner
            drive="Drive 2"
            title="Forensic repeatable exposure generation"
            body="Fifty prompts, three independent runs per model. The judge scores similarity to proprietary reference material and keeps pass/fail flips as inconsistent — they are not collapsed to a single verdict."
            chips={['50 prompts', '3 runs each', '600 executions', `${uk.d2ExposureRate}% exposure`, `${Number(uk.avgSimilarity).toFixed(1)} avg similarity`, `${uk.d2Inconsistent} inconsistent`]}
            color="#8B1E3F"
          />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard title="Reconstruction exposure" value={`${uk.d2ExposureRate}%`} unit="65 of 200 three-run cases" statusColor="#DC2626" />
            <KPICard title="Avg similarity" value={Number(uk.avgSimilarity).toFixed(1)} unit={`${uk.d2HighSimilarity} cases scored ≥70`} statusColor="#00338D" />
            <KPICard title="3-run consistency" value={`${uk.avgConsistency}%`} unit={`${uk.d2Inconsistent} pass/fail flips`} statusColor="#D4A017" />
            <KPICard title="High-severity" value={uk.d2HighRisk} unit="forensic risk labels" statusColor="#8B1E3F" />
            <KPICard title="ChatGPT (control)" value="26.0%" unit="lowest Drive 2 exposure" statusColor="#00A36C" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartPanel title="Similarity vs exposure" hint="Higher similarity = closer overlap with catalogue phrasing. Gemini 44.6 / 40% vs ChatGPT 37.0 / 26%.">
              <BarChart data={data.similarity}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgSimilarity" name="Avg similarity" fill="#00338D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="exposureRate" name="Exposure %" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Three-run consistency bands" hint="Flipped outcomes stay inconsistent. Consistently failed means all three runs leaked.">
              <BarChart data={consistencyChart}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="highly" name="Highly consistent" stackId="a" fill="#00A36C" />
                <Bar dataKey="moderate" name="Moderately consistent" stackId="a" fill="#0077C8" />
                <Bar dataKey="low" name="Low consistency" stackId="a" fill="#D4A017" />
                <Bar dataKey="failed" name="Consistently failed" stackId="a" fill="#DC2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="High-similarity (≥70) and inconsistent cases" hint="64 reconstructions ≥70. 19 cases changed pass/fail across runs (5 / 5 / 5 / 4).">
              <BarChart data={data.similarity}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="highSimilarity" name="Similarity ≥70" fill="#8B1E3F" radius={[6, 6, 0, 0]} />
                <Bar dataKey="inconsistent" name="Inconsistent" fill="#D4A017" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Forensic indicators (200 cases)" hint="Verbatim = 9 exact catalogue reproductions. Structural and proprietary-detail signals dominate.">
              <BarChart data={indicatorChart} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={108} />
                <Tooltip />
                <Bar dataKey="value" fill="#00338D" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartPanel>
          </div>
          <ChartPanel title="Familiarity with proprietary material" hint="Severe 24 + High 31 = 55 cases with strong catalogue familiarity.">
            <BarChart data={familiarityChart}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0077C8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartPanel>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <div className="text-xs font-semibold mb-1">Multi-model reconstruction hotspots</div>
            <p className="text-[11px] text-[#6B7280] mb-3">Probes where at least three models failed or scored ≥70. Class 10 physics tables and worked numericals reconstruct across the panel.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
                  <tr>{['ID', 'Theme', 'Fails', '≥70', 'Max sim', 'Exposed models'].map((h) => <th key={h} className="text-left py-2 pr-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {u.drive2.hotspots.map((h) => (
                    <tr key={h.id} className="border-b border-[#E2E8F0] align-top">
                      <td className="py-2.5 font-mono font-semibold text-[#00338D]">{h.id}</td>
                      <td className="py-2.5">
                        <div className="font-semibold text-[#1A1F36]">{h.title}</div>
                        <div className="text-[11px] text-[#6B7280] mt-0.5 max-w-md leading-relaxed">{h.prompt}</div>
                      </td>
                      <td className="py-2.5 font-mono">{h.failCount}/4</td>
                      <td className="py-2.5 font-mono">{h.highSimCount}/4</td>
                      <td className="py-2.5 font-mono">{h.maxSimilarity}</td>
                      <td className="py-2.5">{h.fails.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <div className="text-xs font-semibold mb-1">Inconsistent regenerations</div>
            <p className="text-[11px] text-[#6B7280] mb-3">19 prompt/model cases where the three independent runs changed between PASS and FAIL. Review separately from stable outcomes.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
                  <tr>{['Model', 'ID', 'Run sequence', 'Pass', 'Sim', 'Risk'].map((h) => <th key={h} className="text-left py-2 pr-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {u.drive2.inconsistentCases.map((c) => (
                    <tr key={`${c.model}-${c.id}`} className="border-b border-[#E2E8F0] align-top">
                      <td className="py-2.5">{c.model}</td>
                      <td className="py-2.5 font-mono text-[#00338D] font-semibold">{c.id}</td>
                      <td className="py-2.5 font-mono">{(c.runs || []).join(' → ')}</td>
                      <td className="py-2.5 font-mono">{c.passRate}</td>
                      <td className="py-2.5 font-mono">{c.similarity}</td>
                      <td className="py-2.5"><RiskBadge risk={c.risk.toLowerCase()} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <FindingsTable
            rows={rows}
            model={model}
            setModel={setModel}
            drive="drive2"
            inconsistentOnly={inconsistentOnly}
            setInconsistentOnly={setInconsistentOnly}
            open={setOpen}
          />
        </>
      )}

      {open && (
        <Drawer title={open.id} onClose={() => setOpen(null)} width="w-[560px]">
          <div className="space-y-3 text-xs">
            <div className="text-sm font-semibold text-[#1A1F36]">{open.title}</div>
            <div className="text-[#6B7280]">{open.author}</div>
            <div className="flex gap-2 flex-wrap">
              <RiskBadge risk={open.risk.toLowerCase()} />
              <Badge color={open.verdict === 'PASS' ? 'green' : 'red'}>{open.verdict}</Badge>
              <Badge>{open.model}</Badge>
              {open.inconsistent && <Badge color="amber">Inconsistent</Badge>}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">Probe prompt</div>
              <p className="leading-relaxed">{open.prompt}</p>
            </div>
            <AIRecommendationCard
              recommendation={open.reason}
              confidence={open.confidence / 100}
              model="AntiPiracy-LLM-Judge-v0.1-demo"
              version="grok-4.3"
              promptVersion="SCHAND-LLM-PROBE-v1"
              methodology="Offline judge on stored model outputs. FAIL = protected structure reproduced. Human review still required before any rights-holder action."
              inputs={{ suite: open.suite, signals: open.signals, similarityScore: open.similarityScore, familiarity: open.familiarity, passRate: open.passRate, runs: open.runs }}
            />
            {open.similarityScore != null && (
              <div>Similarity score {open.similarityScore} · Familiarity {open.familiarity} · {open.consistency}{open.passRate ? ` · ${open.passRate}` : ''}</div>
            )}
            {open.runs && open.runs.length > 0 && <div>Three-run sequence: {open.runs.join(' → ')}</div>}
            <p className="text-[#9CA3AF]">This module replays a completed campaign. The prototype does not call production LLMs.</p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00338D]">{kicker}</div>
      <h2 className="text-lg font-semibold text-[#1A1F36] mt-1">{title}</h2>
      <p className="text-sm text-[#6B7280] mt-1 max-w-3xl leading-relaxed">{body}</p>
    </div>
  );
}

function DriveCard({
  level, drive, title, question, design, executions, result, kri, color, icon: Icon, onOpen,
}: {
  level: string; drive: string; title: string; question: string; design: string; executions: string; result: string; kri: string; color: string;
  icon: ComponentType<{ size?: number; style?: CSSProperties }>;
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen} className="text-left bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white px-2 py-1 rounded" style={{ backgroundColor: color }}>{drive}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">{level}</span>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-[#1A1F36]">{title}</h3>
      <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">{question}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Design</div>
          <div className="font-medium text-[#1A1F36] mt-0.5">{design}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Volume</div>
          <div className="font-medium text-[#1A1F36] mt-0.5">{executions}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Result</div>
          <div className="font-semibold text-[#1A1F36] mt-0.5">{result}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">KRI</div>
          <div className="font-semibold text-[#1A1F36] mt-0.5">{kri}</div>
        </div>
      </div>
      <div className="text-[11px] font-semibold text-[#00338D] mt-4">Open {drive} detail →</div>
    </button>
  );
}

function DriveBanner({ drive, title, body, chips, color }: { drive: string; title: string; body: string; chips: string[]; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 border-l-[3px]" style={{ borderLeftColor: color }}>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{drive}</div>
      <h2 className="text-xl font-semibold text-[#1A1F36] mt-1">{title}</h2>
      <p className="text-sm text-[#6B7280] mt-2 max-w-3xl leading-relaxed">{body}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {chips.map((c) => (
          <span key={c} className="text-[11px] px-2.5 py-1 rounded-full border border-[#E2E8F0] text-[#6B7280]">{c}</span>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, suffix, color, hint }: { label: string; value: number; suffix: string; color: string; hint: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-[11px] text-[#6B7280]">{label}</span>
        <span className="font-mono text-xs font-semibold text-[#1A1F36]">{value}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
      </div>
      <div className="text-[10px] text-[#9CA3AF] mt-1">{hint}</div>
    </div>
  );
}

function ChartPanel({ title, hint, children }: { title: string; hint: string; children: ReactElement }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
      <div className="text-xs font-semibold mb-1">{title}</div>
      <div className="text-[11px] text-[#6B7280] mb-3">{hint}</div>
      <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>
    </div>
  );
}

function FindingsTable({
  rows, model, setModel, drive, inconsistentOnly, setInconsistentOnly, open,
}: {
  rows: LlmFinding[];
  model: string;
  setModel: (v: string) => void;
  drive: 'drive1' | 'drive2';
  inconsistentOnly?: boolean;
  setInconsistentOnly?: (v: boolean) => void;
  open: (f: LlmFinding) => void;
}) {
  const forensic = drive === 'drive2';
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="text-xs font-semibold text-[#1A1F36]">{forensic ? 'Drive 2 forensic findings' : 'Drive 1 awareness findings'}</div>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white">
          <option value="all">All models</option>
          {MODEL_ORDER.map((m) => <option key={m}>{m}</option>)}
        </select>
        {forensic && setInconsistentOnly && (
          <label className="flex items-center gap-2 text-xs text-[#6B7280]">
            <input type="checkbox" checked={!!inconsistentOnly} onChange={(e) => setInconsistentOnly(e.target.checked)} />
            Inconsistent only
          </label>
        )}
        <span className="text-[11px] text-[#9CA3AF]">{rows.length} findings</span>
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#E2E8F0]">
            <tr>
              {['Probe ID', 'Model', 'Title', 'Risk', 'Verdict', forensic ? 'Similarity' : 'Confidence', forensic ? 'Consistency' : 'Judge'].map((h) => (
                <th key={h} className="text-left px-3 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-[#E2E8F0] hover:bg-[#F4F6F9] cursor-pointer" onClick={() => open(f)}>
                <td className="px-3 py-3 font-mono text-[#00338D] font-semibold">{f.id}</td>
                <td className="px-3 py-3">{f.model}</td>
                <td className="px-3 py-3">{f.title}</td>
                <td className="px-3 py-3"><RiskBadge risk={f.risk.toLowerCase()} /></td>
                <td className="px-3 py-3"><Badge color={f.verdict === 'PASS' ? 'green' : 'red'}>{f.verdict}</Badge></td>
                <td className="px-3 py-3 font-mono">{forensic ? (f.similarityScore ?? '—') : `${f.confidence}%`}</td>
                <td className="px-3 py-3">{forensic ? (f.inconsistent ? `${f.consistency} · flip` : f.consistency) : f.judge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function labelIndicator(key: string) {
  const map: Record<string, string> = {
    structural: 'Structural',
    proprietaryDetails: 'Proprietary details',
    reconstruction: 'Reconstruction',
    paraphrase: 'Paraphrase',
    consistentRegen: 'Consistent regen',
    nearVerbatim: 'Near-verbatim',
    verbatim: 'Verbatim',
  };
  return map[key] ?? key;
}

function formatStamp(value: string) {
  const [d, t] = value.split(' ');
  if (!d) return value;
  const [y, m, day] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}${t ? ` · ${t}` : ''}`;
}
