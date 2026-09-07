# Architecture

## Intent

A modular, tenant-aware **IP protection operating platform**. Anti-piracy is module one. The data model, connector framework, workflow engine, evidence vault and RBAC are shared services.

## Runtime

```
Browser (role-based App Shell)
        │
        ▼
Next.js App Router
  /app/(app)/*          pages
  /app/api/[...slug]    controllers
        │
        ▼
Services
  CaseWorkflowService   lib/workflow.ts
  MockAIService         lib/ai.ts
  Discovery connectors  lib/connectors.ts
  SLA / gates           lib/sla.ts
  Analytics             lib/analytics.ts
  Demo orchestrator     lib/demo.ts
        │
        ▼
Store (tenant SCHAND)
  In-memory AppState + optional data/runtime-store.json
```

## Core entities

Tenant, User, Role, Permission, CatalogueAsset, Finding, Investigation, Case, Evidence, EvidenceCustodyEvent, RightsValidation, LegalReview, Notice, Submission, PlatformResponse, Escalation, MonitoringJob, Reappearance, Entity, EntityRelationship, RiskAssessment, AIAssessment, FinancialEstimate, AuditEvent, Report, Configuration, Connector, Job, Notification.

Every major record carries `tenantId`.

## Workflow engine

`CaseWorkflowService` is the only place case status may change. Each transition:

1. Validates RBAC
2. Validates current state
3. Validates required data (e.g. 4/4 gates before legal approval; approved notice before submit)
4. Persists
5. Writes an audit event
6. Emits notifications where applicable

Illegal transitions throw. The UI cannot “skip ahead” by changing a label.

## Four-gate validation

Legal submission is blocked unless:

1. Rights / ownership
2. Infringement substantiated
3. Authorization (not a licensed partner/school)
4. Actionable target (reachable intermediary)

Inherited rights from a parent case still require human confirmation on reappearance.

## Connector framework

```ts
interface DiscoveryConnector {
  discover(): FindingDraft[];
  normalize(raw): FindingDraft;
  score(item): FindingDraft;
}
```

Mocks return synthetic findings. Production replacements must remain **authorized, lawful monitoring** — no CAPTCHA/auth/paywall bypass.

## Agentic but controlled

AI may classify, score, draft notices, recommend routes and detect reappearance.

AI may **not** approve rights, approve legal action, dispatch notices, or close high-risk cases.

## Closed-loop reappearance

`REMOVED` does not close the case. The engine starts a monitoring job. `simulateReappearance`:

- Creates a new finding (different URL/platform/uploader)
- Compares ISBN, fingerprint, watermark, title
- Links `REAPPEARANCE_OF` to the original case
- Issues new evidence with its own SHA-256
- Raises repeat-offender score
- Notifies investigators
- Does **not** send a notice

Human confirm → reopen → new enforcement cycle.

## Configuration

Platforms, SLA, risk thresholds, notice templates, escalation, monitoring cadence, AI model ids, retention and users live in `configuration` on the tenant — not hardcoded in UI components.

## Security

JWT session, RBAC middleware in services, tenant scoping, security headers, env-based secrets, audit log for LOGIN/LOGOUT and material mutations.
