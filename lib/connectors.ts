import type { Finding, PlatformCategory } from "./types";
import { TENANT_ID } from "./constants";
import { nextSeq } from "./ids";
import { MockAIService } from "./ai";

export interface DiscoveryConnector {
  id: string;
  name: string;
  kind: string;
  discover(): FindingDraft[];
  normalize(raw: FindingDraft): FindingDraft;
  score(item: FindingDraft): FindingDraft;
}

export interface FindingDraft {
  platform: string;
  platformCategory: PlatformCategory;
  url: string;
  suspectedTitle: string;
  assetId: string;
  uploader: string;
  entityId: string;
  matchScore: number;
  hostingCountry: string;
  watermarkDetected: boolean;
  ocrSimilarity: number;
  sourceConnector: string;
}

const TITLES: { title: string; assetId: string }[] = [
  { title: "Mathematics for Class 10", assetId: "AST-0001" },
  { title: "Lakhmir Singh Science Class 10", assetId: "AST-0002" },
  { title: "English Grammar & Composition", assetId: "AST-0003" },
  { title: "NEET Preparation Series", assetId: "AST-0004" },
  { title: "Class 9 Mathematics", assetId: "AST-0005" },
  { title: "Quantitative Aptitude", assetId: "AST-0006" },
  { title: "Physics for Class 12", assetId: "AST-0007" },
  { title: "Chemistry for Class 11", assetId: "AST-0008" },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function draft(partial: FindingDraft): FindingDraft {
  return partial;
}

export class MockTelegramConnector implements DiscoveryConnector {
  id = "conn-telegram";
  name = "MockTelegramConnector";
  kind = "telegram";
  discover(): FindingDraft[] {
    return [0, 1, 2].map((i) => {
      const t = pick(TITLES, i + 3);
      return draft({
        platform: "Telegram",
        platformCategory: "messaging",
        url: `https://t.me/edu_share_${200 + i}/${4100 + i}`,
        suspectedTitle: t.title,
        assetId: t.assetId,
        uploader: i === 0 ? "CBSE_NotesHub" : `TeleBooks_${i}`,
        entityId: i === 0 ? "ENT-0003" : "ENT-0008",
        matchScore: 88 + i,
        hostingCountry: "AE",
        watermarkDetected: i !== 2,
        ocrSimilarity: 86 + i,
        sourceConnector: this.name,
      });
    });
  }
  normalize(raw: FindingDraft) {
    return raw;
  }
  score(item: FindingDraft) {
    return item;
  }
}

export class MockWebConnector implements DiscoveryConnector {
  id = "conn-web";
  name = "MockWebConnector";
  kind = "web";
  discover(): FindingDraft[] {
    return [0, 1].map((i) => {
      const t = pick(TITLES, i + 1);
      return draft({
        platform: "Website",
        platformCategory: "web",
        url: `https://free-pdfs-demo.example/cbse/${t.assetId.toLowerCase()}-${i}.pdf`,
        suspectedTitle: t.title,
        assetId: t.assetId,
        uploader: "webmaster@demo-leaks.example",
        entityId: "ENT-0005",
        matchScore: 81 + i * 4,
        hostingCountry: "IN",
        watermarkDetected: false,
        ocrSimilarity: 80 + i,
        sourceConnector: this.name,
      });
    });
  }
  normalize(raw: FindingDraft) {
    return raw;
  }
  score(item: FindingDraft) {
    return item;
  }
}

export class MockMarketplaceConnector implements DiscoveryConnector {
  id = "conn-market";
  name = "MockMarketplaceConnector";
  kind = "marketplace";
  discover(): FindingDraft[] {
    const t = TITLES[4];
    return [
      draft({
        platform: "Marketplace",
        platformCategory: "marketplace",
        url: "https://market.example-demo.com/listing/edu-wholesale-3291",
        suspectedTitle: t.title,
        assetId: t.assetId,
        uploader: "EduBooks Wholesale",
        entityId: "ENT-0004",
        matchScore: 89,
        hostingCountry: "IN",
        watermarkDetected: false,
        ocrSimilarity: 78,
        sourceConnector: this.name,
      }),
    ];
  }
  normalize(raw: FindingDraft) {
    return raw;
  }
  score(item: FindingDraft) {
    return item;
  }
}

export class MockCloudStorageConnector implements DiscoveryConnector {
  id = "conn-cloud";
  name = "MockCloudStorageConnector";
  kind = "cloud_storage";
  discover(): FindingDraft[] {
    const t = TITLES[1];
    return [
      draft({
        platform: "Google Drive",
        platformCategory: "cloud_storage",
        url: "https://drive.google.com/file/d/demo-scan-lakhmir-10/view",
        suspectedTitle: t.title,
        assetId: t.assetId,
        uploader: "FreeStudyHub",
        entityId: "ENT-0002",
        matchScore: 93,
        hostingCountry: "US",
        watermarkDetected: true,
        ocrSimilarity: 91,
        sourceConnector: this.name,
      }),
    ];
  }
  normalize(raw: FindingDraft) {
    return raw;
  }
  score(item: FindingDraft) {
    return item;
  }
}

export const CONNECTORS: DiscoveryConnector[] = [
  new MockTelegramConnector(),
  new MockWebConnector(),
  new MockMarketplaceConnector(),
  new MockCloudStorageConnector(),
];

export function runDiscoveryScan(existingUrls: Set<string>): {
  findings: Finding[];
  sourcesScanned: number;
  newFindings: number;
  duplicatesRemoved: number;
  highConfidence: number;
  critical: number;
} {
  const raw = CONNECTORS.flatMap((c) => c.discover().map((d) => c.score(c.normalize(d))));
  const sourcesScanned = 12;
  let duplicatesRemoved = 0;
  const unique: FindingDraft[] = [];
  for (const item of raw) {
    if (existingUrls.has(item.url) || unique.some((u) => u.url === item.url)) {
      duplicatesRemoved += 1;
      continue;
    }
    unique.push(item);
  }

  const findings: Finding[] = unique.map((item) => {
    const rec = MockAIService.recommendPriority({
      matchScore: item.matchScore,
      priorityTitle: item.assetId === "AST-0001" || item.assetId === "AST-0002",
      platform: item.platform,
    });
    const idNum = nextSeq();
    return {
      id: `FND-2026-${idNum}`,
      tenantId: TENANT_ID,
      detectedAt: new Date().toISOString(),
      platform: item.platform,
      platformCategory: item.platformCategory,
      url: item.url,
      suspectedTitle: item.suspectedTitle,
      assetId: item.assetId,
      uploader: item.uploader,
      entityId: item.entityId,
      matchScore: item.matchScore,
      aiConfidence: Math.min(99, item.matchScore + 2),
      priority: rec.priority,
      risk: rec.priority,
      status: item.matchScore >= 90 ? "ai_flagged" : "new",
      assignedInvestigatorId: "USR-INV-02",
      hostingCountry: item.hostingCountry,
      watermarkDetected: item.watermarkDetected,
      ocrSimilarity: item.ocrSimilarity,
      metadata: { connector: item.sourceConnector, simulated: true },
      relatedFindingIds: [],
      relatedCaseId: null,
      notes: "",
      sourceConnector: item.sourceConnector,
      jobId: null,
    };
  });

  return {
    findings,
    sourcesScanned,
    newFindings: findings.length,
    duplicatesRemoved,
    highConfidence: findings.filter((f) => f.matchScore >= 90).length,
    critical: findings.filter((f) => f.risk === "critical").length,
  };
}
