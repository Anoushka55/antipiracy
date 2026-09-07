export type TenantId = "SCHAND" | "CLIENT_A" | "CLIENT_B";

export type Role =
  | "executive"
  | "lead"
  | "investigator"
  | "legal"
  | "operations"
  | "admin";

export type RiskLevel = "critical" | "high" | "medium" | "low";
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export type FindingStatus =
  | "new"
  | "ai_flagged"
  | "needs_validation"
  | "validated"
  | "promoted"
  | "rejected"
  | "linked_reappearance";

export type CaseStatus =
  | "new"
  | "investigating"
  | "rights_validation"
  | "legal_review"
  | "legal_approved"
  | "notice_ready"
  | "submitted"
  | "awaiting_response"
  | "removed"
  | "escalated"
  | "monitoring"
  | "reopened"
  | "closed"
  | "approved_hold"
  | "rejected";

export type NoticeRoute =
  | "platform_ip_form"
  | "us_dmca"
  | "india_intermediary"
  | "registrar_hosting"
  | "escalated_legal";

export type PlatformCategory =
  | "messaging"
  | "cloud_storage"
  | "web"
  | "marketplace"
  | "social"
  | "cyberlocker";

export type EvidenceType =
  | "pdf_binary"
  | "screenshot"
  | "metadata"
  | "html_capture"
  | "channel_snapshot";

export type GateResult = "pass" | "fail" | "hold";

export interface Tenant {
  id: TenantId;
  name: string;
  legalName: string;
  environment: "prototype" | "staging" | "production";
}

export interface User {
  id: string;
  tenantId: TenantId;
  name: string;
  title: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
}

export interface CatalogueAsset {
  id: string;
  tenantId: TenantId;
  title: string;
  isbn: string;
  edition: string;
  author: string;
  category: string;
  segment: string;
  priorityTitle: boolean;
  rightsOwner: string;
  territories: string[];
  releaseDate: string;
  status: "active" | "legacy" | "forthcoming";
  aliases: string[];
  piracyPatterns: string[];
  indicativeValueInr: number;
}

export interface Finding {
  id: string;
  tenantId: TenantId;
  detectedAt: string;
  platform: string;
  platformCategory: PlatformCategory;
  url: string;
  suspectedTitle: string;
  assetId: string;
  uploader: string;
  entityId: string;
  matchScore: number;
  aiConfidence: number;
  priority: PriorityLevel;
  risk: RiskLevel;
  status: FindingStatus;
  assignedInvestigatorId: string | null;
  hostingCountry: string;
  watermarkDetected: boolean;
  ocrSimilarity: number;
  metadata: Record<string, string | number | boolean>;
  relatedFindingIds: string[];
  relatedCaseId: string | null;
  notes: string;
  sourceConnector: string;
  jobId: string | null;
}

export interface Investigation {
  id: string;
  tenantId: TenantId;
  findingId: string;
  caseId: string | null;
  investigatorId: string;
  status: "open" | "insufficient_evidence" | "false_positive" | "confirmed";
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CaseRecord {
  id: string;
  tenantId: TenantId;
  findingId: string;
  investigationId: string;
  assetId: string;
  title: string;
  platform: string;
  url: string;
  uploader: string;
  entityId: string;
  risk: RiskLevel;
  priority: PriorityLevel;
  ownerId: string;
  status: CaseStatus;
  noticeRoute: NoticeRoute | null;
  daysOpen: number;
  slaHours: number;
  slaDueAt: string;
  slaState: "within" | "approaching" | "breached";
  reappearance: boolean;
  lastAction: string;
  lastActionAt: string;
  createdAt: string;
  hostingCountry: string;
  parentCaseId: string | null;
  evidenceIds: string[];
  noticeId: string | null;
  submissionId: string | null;
  monitoringJobId: string | null;
}

export interface Evidence {
  id: string;
  tenantId: TenantId;
  caseId: string | null;
  findingId: string;
  type: EvidenceType;
  sourceUrl: string;
  capturedAt: string;
  capturedBy: string;
  toolVersion: string;
  sha256: string;
  storageLocation: string;
  chainOfCustodyStatus: "intact" | "gap" | "verified";
  integrity: "verified" | "mismatch" | "pending";
  relatedEvidenceId: string | null;
  metadata: Record<string, string | number>;
  previewLabel: string;
}

export interface EvidenceCustodyEvent {
  id: string;
  tenantId: TenantId;
  evidenceId: string;
  event:
    | "captured"
    | "hash_generated"
    | "stored"
    | "investigator_accessed"
    | "hash_verified"
    | "legal_reviewed"
    | "notice_attached";
  actorId: string;
  timestamp: string;
  detail: string;
}

export interface FourGates {
  rightsOwnership: GateResult;
  infringementSubstantiated: GateResult;
  authorization: GateResult;
  actionableTarget: GateResult;
}

export interface RightsValidation {
  id: string;
  tenantId: TenantId;
  caseId: string;
  gates: FourGates;
  inheritedFromCaseId: string | null;
  confirmationRequired: boolean;
  confirmed: boolean;
  reviewerId: string | null;
  reviewedAt: string | null;
  notes: string;
  title: string;
  isbn: string;
  edition: string;
  author: string;
  rightsOwner: string;
  territory: string;
}

export interface LegalReview {
  id: string;
  tenantId: TenantId;
  caseId: string;
  reviewerId: string | null;
  status: "pending" | "approved" | "hold" | "rejected";
  jurisdiction: string;
  recommendedRoute: NoticeRoute;
  routeConfidence: "high" | "medium" | "low";
  routeReason: string;
  approvedAt: string | null;
  notes: string;
}

export interface Notice {
  id: string;
  tenantId: TenantId;
  caseId: string;
  route: NoticeRoute;
  status: "draft" | "approved" | "dispatched";
  complainant: string;
  copyrightedWork: string;
  ownership: string;
  infringingMaterial: string;
  location: string;
  description: string;
  goodFaithDeclaration: string;
  authorization: string;
  signature: string;
  generatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface Submission {
  id: string;
  tenantId: TenantId;
  caseId: string;
  noticeId: string;
  ticketId: string;
  destination: string;
  status: "submitted" | "awaiting_response" | "acknowledged" | "removed" | "rejected";
  submittedAt: string;
  submittedBy: string;
  simulated: true;
}

export interface PlatformResponse {
  id: string;
  tenantId: TenantId;
  submissionId: string;
  caseId: string;
  outcome: "removed" | "rejected" | "more_info" | "no_response";
  receivedAt: string;
  summary: string;
  simulated: true;
}

export interface Escalation {
  id: string;
  tenantId: TenantId;
  caseId: string;
  reason: string;
  createdAt: string;
  status: "open" | "acknowledged" | "resolved";
  notifyRoles: Role[];
  recommendedRoute: NoticeRoute | null;
}

export interface MonitoringJob {
  id: string;
  tenantId: TenantId;
  caseId: string;
  status: "active" | "paused" | "completed";
  windowDays: number;
  cadence: "daily" | "weekly" | "monthly";
  startedAt: string;
  nextScanAt: string;
  lastScanAt: string | null;
}

export interface Reappearance {
  id: string;
  tenantId: TenantId;
  originalCaseId: string;
  newFindingId: string;
  originalUrl: string;
  newUrl: string;
  platform: string;
  uploader: string;
  similarity: number;
  titleSimilarity: number;
  isbnMatch: boolean;
  fingerprintMatch: boolean;
  watermarkMatch: boolean;
  relationship: "likely_mirror" | "same_channel" | "related_entity" | "reappearance_of";
  detectedAt: string;
  confidence: number;
  reasons: string[];
  confirmed: boolean;
}

export interface EntityRecord {
  id: string;
  tenantId: TenantId;
  name: string;
  kind:
    | "uploader"
    | "domain"
    | "telegram_channel"
    | "marketplace_seller"
    | "email"
    | "payment"
    | "organization";
  riskScore: number;
  previousCases: number;
  successfulRemovals: number;
  reappearances: number;
  avgTimeToReappearanceDays: number;
  platforms: string[];
  linkedDomains: string[];
  labels: string[];
}

export interface EntityRelationship {
  id: string;
  tenantId: TenantId;
  fromEntityId: string;
  toEntityId: string;
  type: "same_operator" | "shared_payment" | "mirror_of" | "linked_channel" | "related";
  weight: number;
}

export interface RiskAssessment {
  id: string;
  tenantId: TenantId;
  subjectType: "finding" | "case" | "entity";
  subjectId: string;
  score: number;
  level: RiskLevel;
  input: Record<string, unknown>;
  assumption: string;
  methodology: string;
  methodologyVersion: string;
  confidence: number;
  timestamp: string;
}

export interface AIAssessment {
  id: string;
  tenantId: TenantId;
  subjectType: string;
  subjectId: string;
  recommendation: string;
  confidence: number;
  model: string;
  version: string;
  promptVersion: string;
  timestamp: string;
  inputs: Record<string, unknown>;
  methodology: string;
  humanValidationRequired: true;
}

export interface FinancialEstimate {
  id: string;
  tenantId: TenantId;
  label: string;
  valueInr: number;
  input: Record<string, unknown>;
  assumption: string;
  formula: string;
  methodology: string;
  methodologyVersion: string;
  confidence: "low" | "medium" | "high";
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  tenantId: TenantId;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string;
  sessionId: string;
}

export interface AppNotification {
  id: string;
  tenantId: TenantId;
  title: string;
  body: string;
  severity: "critical" | "high" | "medium" | "info";
  createdAt: string;
  read: boolean;
  href: string;
  audience: Role[] | "all";
}

export interface PlatformConfig {
  id: string;
  tenantId: TenantId;
  name: string;
  category: PlatformCategory;
  defaultSlaHours: number;
  supportedNoticeRoutes: NoticeRoute[];
  enabled: boolean;
}

export interface SlaRule {
  id: string;
  tenantId: TenantId;
  risk: RiskLevel;
  hours: number;
}

export interface EscalationRule {
  id: string;
  tenantId: TenantId;
  trigger: "sla_breached" | "reappearance" | "critical_priority";
  notifyRoles: Role[];
  createTask: boolean;
}

export interface MonitoringCadence {
  id: string;
  tenantId: TenantId;
  risk: RiskLevel;
  initialDays: number;
  initialCadence: "daily" | "weekly";
  thenCadence: "weekly" | "monthly";
}

export interface NoticeTemplate {
  id: string;
  tenantId: TenantId;
  route: NoticeRoute;
  name: string;
  body: string;
}

export interface AIConfig {
  tenantId: TenantId;
  matchModel: string;
  matchVersion: string;
  forecastModel: string;
  forecastVersion: string;
  promptVersion: string;
  enabled: boolean;
}

export interface RetentionPolicy {
  tenantId: TenantId;
  evidenceDays: number;
  auditDays: number;
  caseDays: number;
}

export interface Connector {
  id: string;
  tenantId: TenantId;
  name: string;
  kind: "telegram" | "web" | "marketplace" | "cloud_storage";
  status: "healthy" | "warning" | "degraded";
  lastRunAt: string | null;
  avgMs: number;
  errorRate: number;
}

export interface Job {
  id: string;
  tenantId: TenantId;
  type: "discovery" | "monitoring" | "reappearance" | "demo_story" | "platform_response";
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  createdAt: string;
  completedAt: string | null;
  result: Record<string, unknown> | null;
  logs: string[];
}

export interface StatusTransition {
  id: string;
  tenantId: TenantId;
  caseId: string;
  from: CaseStatus | null;
  to: CaseStatus;
  actorId: string;
  timestamp: string;
  reason: string;
}

export interface AppConfiguration {
  tenantId: TenantId;
  demoMode: boolean;
  riskThresholds: { critical: number; high: number; medium: number };
  priorityTitleWeight: number;
  dashboardKpiOverrides: Record<string, number | string> | null;
  platforms: PlatformConfig[];
  slaRules: SlaRule[];
  escalationRules: EscalationRule[];
  monitoringCadence: MonitoringCadence[];
  noticeTemplates: NoticeTemplate[];
  ai: AIConfig;
  retention: RetentionPolicy;
}

export interface AppState {
  tenant: Tenant;
  users: User[];
  catalogue: CatalogueAsset[];
  findings: Finding[];
  investigations: Investigation[];
  cases: CaseRecord[];
  evidence: Evidence[];
  custodyEvents: EvidenceCustodyEvent[];
  rightsValidations: RightsValidation[];
  legalReviews: LegalReview[];
  notices: Notice[];
  submissions: Submission[];
  platformResponses: PlatformResponse[];
  escalations: Escalation[];
  monitoringJobs: MonitoringJob[];
  reappearances: Reappearance[];
  entities: EntityRecord[];
  entityRelationships: EntityRelationship[];
  riskAssessments: RiskAssessment[];
  aiAssessments: AIAssessment[];
  financialEstimates: FinancialEstimate[];
  auditEvents: AuditEvent[];
  notifications: AppNotification[];
  configuration: AppConfiguration;
  connectors: Connector[];
  jobs: Job[];
  transitions: StatusTransition[];
  demo: {
    storyStep: number;
    reappearanceSimulated: boolean;
    signatureCaseReady: boolean;
  };
}

export interface SessionUser {
  id: string;
  tenantId: TenantId;
  name: string;
  title: string;
  email: string;
  role: Role;
}
