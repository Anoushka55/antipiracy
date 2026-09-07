import type { AIAssessment, Finding, NoticeRoute, RiskLevel } from "./types";
import {
  MODEL_FORECAST,
  MODEL_MATCH,
  MODEL_MATCH_VERSION,
  PROMPT_VERSION,
  TENANT_ID,
} from "./constants";
import { uuidLike } from "./ids";

export interface AIService {
  classifyFinding(finding: Partial<Finding>): AIAssessment;
  calculateSimilarity(input: {
    title: string;
    isbn?: string;
    ocr: number;
    visual: number;
    metadata: number;
    watermark: boolean;
  }): {
    text: number;
    visual: number;
    metadata: number;
    watermark: boolean;
    overall: number;
    recommendation: string;
    confidence: number;
  };
  recommendPriority(input: {
    matchScore: number;
    priorityTitle: boolean;
    platform: string;
  }): { priority: RiskLevel; reason: string };
  summarizeCase(title: string, platform: string, uploader: string): string;
  recommendNoticeRoute(platform: string): {
    route: NoticeRoute;
    confidence: "high" | "medium" | "low";
    reason: string;
  };
  forecastExposure(): {
    statement: string;
    confidence: "low" | "medium" | "high";
    methodologyVersion: string;
  };
}

function assessment(
  subjectType: string,
  subjectId: string,
  recommendation: string,
  confidence: number,
  inputs: Record<string, unknown>,
  methodology: string
): AIAssessment {
  return {
    id: uuidLike("AI"),
    tenantId: TENANT_ID,
    subjectType,
    subjectId,
    recommendation,
    confidence,
    model: MODEL_MATCH,
    version: MODEL_MATCH_VERSION,
    promptVersion: PROMPT_VERSION,
    timestamp: new Date().toISOString(),
    inputs,
    methodology,
    humanValidationRequired: true,
  };
}

export const MockAIService: AIService = {
  classifyFinding(finding) {
    const score = finding.matchScore ?? 80;
    const rec =
      score >= 95
        ? "LIKELY INFRINGEMENT — priority title exposure"
        : score >= 85
          ? "LIKELY INFRINGEMENT"
          : score >= 70
            ? "POSSIBLE INFRINGEMENT — human review"
            : "WEAK MATCH — validate before promotion";
    return assessment(
      "finding",
      finding.id ?? "unknown",
      rec,
      Math.min(0.99, 0.55 + score / 200),
      {
        matchScore: score,
        platform: finding.platform,
        title: finding.suspectedTitle,
      },
      "Synthetic similarity model combining OCR, metadata and watermark indicators."
    );
  },

  calculateSimilarity(input) {
    const watermarkBoost = input.watermark ? 4 : 0;
    const overall = Math.min(
      99,
      Math.round(
        input.ocr * 0.4 + input.visual * 0.3 + input.metadata * 0.25 + watermarkBoost
      )
    );
    return {
      text: input.ocr,
      visual: input.visual,
      metadata: input.metadata,
      watermark: input.watermark,
      overall,
      recommendation: overall >= 90 ? "LIKELY INFRINGEMENT" : "REVIEW REQUIRED",
      confidence: Math.min(0.99, overall / 100),
    };
  },

  recommendPriority(input) {
    if (input.priorityTitle && input.matchScore >= 90)
      return { priority: "critical", reason: "Priority title with high-confidence match." };
    if (input.matchScore >= 92) return { priority: "high", reason: "High content match score." };
    if (input.matchScore >= 80) return { priority: "medium", reason: "Moderate match; validate." };
    return { priority: "low", reason: "Below priority threshold." };
  },

  summarizeCase(title, platform, uploader) {
    return `${title} appears to be distributed on ${platform} by ${uploader}. Synthetic analysis indicates a high-likelihood match against the S. Chand protected catalogue. Human validation is required before legal action.`;
  },

  recommendNoticeRoute(platform) {
    const p = platform.toLowerCase();
    if (p.includes("telegram"))
      return {
        route: "platform_ip_form",
        confidence: "high",
        reason: "Target platform supports structured IP reporting.",
      };
    if (p.includes("drive") || p.includes("google"))
      return {
        route: "platform_ip_form",
        confidence: "high",
        reason: "Cloud storage provider accepts copyright removal requests.",
      };
    if (p.includes("marketplace") || p.includes("amazon") || p.includes("flipkart"))
      return {
        route: "india_intermediary",
        confidence: "medium",
        reason: "Marketplace intermediary notice is the configured India route.",
      };
    if (p.includes("host") || p.includes("file"))
      return {
        route: "registrar_hosting",
        confidence: "medium",
        reason: "Independent file host — registrar/hosting escalation recommended.",
      };
    return {
      route: "india_intermediary",
      confidence: "medium",
      reason: "Default India intermediary notice for unclassified web targets.",
    };
  },

  forecastExposure() {
    return {
      statement:
        "Expected PDF-sharing activity may increase during the upcoming examination period.",
      confidence: "medium",
      methodologyVersion: MODEL_FORECAST,
    };
  },
};
