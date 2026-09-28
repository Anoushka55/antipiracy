import type { FourGates, Role } from "./types";
import { ROLE_LABEL, CASE_STATUS_LABEL } from "./constants";
import { navAllowed } from "./rbac";
import {
  PAGE_GUIDES,
  WORKFLOW_STAGES,
  FAQ,
  GATE_LABELS,
  GATE_EXPLANATIONS,
  gateResultMeaning,
  type PageGuide,
} from "./kbot-knowledge";

export interface SuggestedLink {
  label: string;
  href: string;
}

export interface KBotReply {
  text: string;
  suggestedLinks?: SuggestedLink[];
}

export interface CaseChatContext {
  caseId: string;
  status: string;
  gates?: FourGates | null;
  legalStatus?: string | null;
}

/** The live Overview numbers K.Bot can quote when describing that page — see ChatThread's overview fetch. */
export interface LiveOverviewStats {
  activeCases: number;
  criticalHigh: number;
  takedownRate: number;
  slaBreachRate: number;
  reappearanceRate: number;
  estimatedExposureCr: number;
  avgRemovalDays: number;
  priorityTitleExposure: number;
  /** New active cases opened in the last 7 days (see kpiTrends.activeCases in lib/metrics.ts). */
  newCasesThisWeek: number;
  /** New confirmed reappearances (resurfaced piracy) in the last 7 days. */
  newReappearancesThisWeek: number;
  /** Active cases by platform, highest first — used to name where new piracy is showing up. */
  platforms: { name: string; value: number }[];
  slaBreachCount: number;
  reappearances: number;
}

export interface KBotQuery {
  message: string;
  role: Role;
  pathname: string;
  caseContext?: CaseChatContext | null;
  liveStats?: LiveOverviewStats | null;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreKeywords(input: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (input.includes(kw)) score += kw.length; // longer/more specific matches score higher
  }
  return score;
}

function pageGuideForRole(page: PageGuide, role: Role): PageGuide & { accessible: boolean } {
  return { ...page, accessible: navAllowed(role, page.roles) };
}

/**
 * A live snapshot appended to the Overview page guide, tailored to what each
 * role actually needs to see first. Executive gets the business picture
 * (exposure, risk, programme health); Anti-Piracy Lead and Legal get the
 * operational picture (new cases, new platforms, reappearances, notices);
 * everyone else gets a short general summary.
 */
function liveOverviewSummary(stats: LiveOverviewStats, role: Role): string {
  const topPlatforms = stats.platforms.slice(0, 3).map((p) => `${p.name} (${p.value})`).join(", ") || "no active platform data";

  if (role === "executive") {
    return (
      `**Business snapshot**\n` +
      `- **${stats.activeCases} active cases** open, **${stats.criticalHigh} critical/high risk**\n` +
      `- **${stats.takedownRate}% takedown success** — notices sent that end in removal\n` +
      `- **${stats.slaBreachRate}% SLA breach rate** (${stats.slaBreachCount} cases past their deadline)\n` +
      `- **${stats.reappearanceRate}% reappearance rate** — removed content resurfacing elsewhere\n` +
      `- **${stats.priorityTitleExposure}% of active cases** are on flagship/priority titles\n` +
      `- **₹${stats.estimatedExposureCr} lakh** estimated revenue exposure\n` +
      `- Highest activity on: ${topPlatforms}\n\n` +
      `This is the picture a CXO should check daily: how much risk is open, how fast it's being closed, and where the money is at stake.`
    );
  }

  if (role === "lead" || role === "legal") {
    return (
      `**Enforcement snapshot**\n` +
      `- **${stats.newCasesThisWeek} new case${stats.newCasesThisWeek === 1 ? "" : "s"}** opened in the last 7 days (${stats.activeCases} active in total)\n` +
      `- Piracy activity is concentrated on: ${topPlatforms}\n` +
      `- **${stats.newReappearancesThisWeek} new reappearance${stats.newReappearancesThisWeek === 1 ? "" : "s"}** this week (${stats.reappearances} total resurfaced items being tracked)\n` +
      `- **${stats.slaBreachCount} cases are past their SLA** and need escalation\n` +
      `- **${stats.avgRemovalDays} days** average time from notice to removal\n\n` +
      `Start with the SLA breaches and the newest cases on the busiest platform — that's where enforcement time matters most today.`
    );
  }

  return (
    `Right now: **${stats.activeCases} active cases** (${stats.criticalHigh} critical/high), ` +
    `**${stats.takedownRate}% takedown rate**, **${stats.slaBreachRate}% SLA breach rate**, ` +
    `**${stats.reappearanceRate}% reappearance rate**, and **₹${stats.estimatedExposureCr} lakh** estimated exposure.`
  );
}

function describePage(page: PageGuide, role: Role, liveStats?: LiveOverviewStats | null): KBotReply {
  const guide = pageGuideForRole(page, role);
  if (!guide.accessible) {
    return {
      text: `**${guide.title}** (${guide.href}) — ${guide.whatItIs}\n\nHeads up: your role (${ROLE_LABEL[role]}) doesn't have access to this page, so I can't route you there directly. If you need it, check with an Anti-Piracy Lead or Technology Lead.`,
    };
  }
  const steps = guide.howToUseIt.map((s) => `- ${s}`).join("\n");
  const summary = guide.id === "overview" && liveStats ? `\n\n${liveOverviewSummary(liveStats, role)}` : "";
  return {
    text: `**${guide.title}** — ${guide.whatItIs}${summary}\n\nHow to use it:\n${steps}`,
    suggestedLinks: [
      { label: `Open ${guide.title}`, href: guide.href },
      ...guide.relatedPages
        .map((id) => PAGE_GUIDES.find((p) => p.id === id))
        .filter((p): p is PageGuide => !!p && navAllowed(role, p.roles))
        .slice(0, 2)
        .map((p) => ({ label: p.title, href: p.href })),
    ],
  };
}

function describeWorkflowStage(status: string): KBotReply | null {
  const stage = WORKFLOW_STAGES.find((s) => s.status === status);
  if (!stage) return null;
  return {
    text: `This case is in **${stage.label}**.\n\n${stage.whatHappensHere}\n\nNext step: ${stage.nextAction}\n\n(Typically handled by: ${stage.whoActs.map((r) => ROLE_LABEL[r]).join(", ")}.)`,
    suggestedLinks: [{ label: "Open Cases", href: "/cases" }],
  };
}

function describeGates(gates: FourGates): string {
  return (Object.keys(gates) as (keyof FourGates)[])
    .map((key) => `- ${GATE_LABELS[key]}: **${gates[key]}** — ${gateResultMeaning(gates[key])}. ${GATE_EXPLANATIONS[key]}`)
    .join("\n");
}

function generalWorkflowOverview(): KBotReply {
  const stages = WORKFLOW_STAGES.slice(0, 8)
    .map((s) => `${s.label} → `)
    .join("")
    .replace(/ → $/, "");
  return {
    text: `The case lifecycle runs: ${stages} … and closes out, with monitoring and reappearance handling built in along the way.\n\nOpen a specific case and ask me "what should I do next?" and I'll tell you exactly where that case stands.`,
    suggestedLinks: [{ label: "Open Cases", href: "/cases" }],
  };
}

const NEXT_STEP_PHRASES = ["what should i do", "what do i do", "what next", "next step", "what now", "where am i"];
const FOUR_GATES_PHRASES = ["four gate", "4 gate", "gates status", "gate status", "which gates"];

export function answerQuery(query: KBotQuery): KBotReply {
  const input = normalize(query.message);
  if (!input) {
    return { text: "Go ahead and ask me anything about the platform — navigation, workflow, or a specific case." };
  }

  // 1. Explicit "what's next" / "where am I" on a case page.
  if (query.caseContext && NEXT_STEP_PHRASES.some((p) => input.includes(p))) {
    const stageReply = describeWorkflowStage(query.caseContext.status);
    if (stageReply) {
      let text = stageReply.text;
      if (query.caseContext.gates) {
        text += `\n\nFour-gate status:\n${describeGates(query.caseContext.gates)}`;
      }
      return { ...stageReply, text };
    }
  }

  // 2. Four-gate specific question, grounded in live case context if present.
  if (FOUR_GATES_PHRASES.some((p) => input.includes(p))) {
    if (query.caseContext?.gates) {
      return {
        text: `Here's where the four gates stand for case ${query.caseContext.caseId}:\n\n${describeGates(query.caseContext.gates)}`,
      };
    }
    return {
      text: `Every case must pass four gates before legal action can proceed:\n\n${(Object.keys(GATE_LABELS) as (keyof typeof GATE_LABELS)[])
        .map((k) => `- **${GATE_LABELS[k]}**: ${GATE_EXPLANATIONS[k]}`)
        .join("\n")}`,
    };
  }

  // 3. Page/navigation match — score every page guide and take the best hit.
  let bestPage: PageGuide | null = null;
  let bestPageScore = 0;
  for (const page of PAGE_GUIDES) {
    const score = scoreKeywords(input, page.keywords) + scoreKeywords(input, [page.title.toLowerCase()]);
    if (score > bestPageScore) {
      bestPageScore = score;
      bestPage = page;
    }
  }

  // 4. Workflow/status question (general, not case-specific).
  const statusMatch = Object.entries(CASE_STATUS_LABEL).find(([, label]) => input.includes(label.toLowerCase()));
  let bestWorkflowScore = 0;
  if (statusMatch) bestWorkflowScore = statusMatch[1].length;
  const workflowKeywordHit = ["workflow", "lifecycle", "case status", "case stage"].some((k) => input.includes(k));
  if (workflowKeywordHit) bestWorkflowScore = Math.max(bestWorkflowScore, 8);

  // 5. FAQ match.
  let bestFaqScore = 0;
  let bestFaq: (typeof FAQ)[number] | null = null;
  for (const entry of FAQ) {
    const score = scoreKeywords(input, entry.keywords);
    if (score > bestFaqScore) {
      bestFaqScore = score;
      bestFaq = entry;
    }
  }

  // Pick the highest-scoring category.
  const scores: [number, () => KBotReply][] = [
    [bestPageScore, () => describePage(bestPage as PageGuide, query.role, query.liveStats)],
    [
      bestWorkflowScore,
      () => {
        if (statusMatch) {
          const stageReply = describeWorkflowStage(statusMatch[0]);
          if (stageReply) return stageReply;
        }
        return generalWorkflowOverview();
      },
    ],
    [bestFaqScore, () => ({ text: bestFaq!.answer })],
  ];

  scores.sort((a, b) => b[0] - a[0]);
  const [topScore, topReply] = scores[0];

  if (topScore > 0) {
    return topReply();
  }

  // 6. Fallback.
  const examplePages = PAGE_GUIDES.filter((p) => navAllowed(query.role, p.roles))
    .slice(0, 3)
    .map((p) => p.title);
  return {
    text: `I didn't quite catch that. Try asking me something like:\n- "How do I use ${examplePages[0] ?? "Discovery"}?"\n- "What should I do next?" (while viewing a case)\n- "What are the four gates?"\n- "Is this data real?"`,
    suggestedLinks: PAGE_GUIDES.filter((p) => navAllowed(query.role, p.roles))
      .slice(0, 3)
      .map((p) => ({ label: p.title, href: p.href })),
  };
}

const GREETINGS = [
  "Hey! I'm K.Bot, your platform buddy. What can I help you with today?",
  "Hi there — K.Bot here. Ask me anything about navigating the platform or what to do next on a case.",
  "Welcome back! I'm K.Bot. Need a hand finding something or figuring out your next move?",
];

export function greet(user: { name: string; role: Role } | null, caseContext?: CaseChatContext | null): string {
  const base = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  if (!user) return base;
  const roleLabel = ROLE_LABEL[user.role];
  let text = `${base}\n\nYou're signed in as ${user.name} (${roleLabel}).`;
  if (caseContext) {
    const stage = WORKFLOW_STAGES.find((s) => s.status === caseContext.status);
    if (stage) {
      text += ` I can see you're on a case that's currently in **${stage.label}** — just ask "what should I do next?" if you'd like guidance.`;
    }
  }
  return text;
}
