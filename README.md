# S. Chand Anti-Piracy Command Center

Enterprise **IP protection & enforcement** prototype for **S. Chand & Company Limited**.

This is a client-facing operating platform, not a static dashboard. It demonstrates how S. Chand can run a closed-loop anti-piracy operation:

**Discover → Investigate → Validate → Evidence → Legal approval → Enforce → Track → Escalate → Monitor → Reappearance → Reopen → Close → Learn**

Visual language follows the KPMG × Knexus.AI design system (navy / accent / enterprise chrome) with S. Chand tenant branding.

> **Prototype / Synthetic Data.** No live scraping, Telegram collection, DMCA filing, or production AI APIs are used. Mock connectors and deterministic AI services share the same interfaces future production adapters will implement.

---

## Product overview

Anti-piracy is the first **module** on a tenant-aware platform. Shared services (identity, catalogue, evidence, cases, workflow, notifications, analytics, audit, connectors, configuration) are designed so later modules — brand protection, trademark, counterfeit, marketplace, social, AI/LLM exposure — can plug in without rewriting the core.

Automation assists investigators. It does **not** independently approve rights, send legal notices, or close high-risk cases. The UI always separates **AI Recommendation** from **Human Decision**.

## Technology stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind + KPMG design-system components + Recharts + Framer Motion |
| Auth | Signed JWT session cookie (`jose`) + RBAC |
| Data | In-memory tenant store with optional JSON persistence (`data/runtime-store.json`) |
| Tests | Vitest |

## Local setup

```bash
npm install
copy .env.example .env.local   # Windows
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | JWT signing secret |
| `DEFAULT_TENANT_ID` | Demo tenant (`SCHAND`) |
| `APP_ENV` | Label (`prototype`) |
| `PERSIST_STORE` | Persist store to `data/runtime-store.json` |

No production credentials are stored in source. Future Telegram / marketplace / object-storage secrets belong only in environment or a vault.

## Demo users

Shared password: **`Schand@2026`**

| Persona | Email | Role |
| --- | --- | --- |
| Mr. Sourabh | sourabh@schand.demo | Executive (read-only strategic) |
| Mr. Murli | murli@schand.demo | Anti-Piracy Lead |
| Enforcement Analyst 02 | inv02@schand.demo | Investigator |
| Legal Reviewer 01 | legal@schand.demo | Legal Reviewer |
| Platform Operations 01 | ops@schand.demo | Operations / Dispatcher |
| B. Pradhan | b.pradhan@schand.demo | Technology Admin |

## Signature demo

1. Sign in as Investigator (`inv02@schand.demo`).
2. Open **Discovery** → `FND-2026-1092` (Mathematics for Class 10 / AcademicLeaks_IN).
3. Review evidence on the case, **Verify Hash**.
4. Promote to case `SC-2026-0842` (or open the seeded case).
5. Confirm infringement → Legal user approves **4/4 gates** and legal action.
6. Generate / approve notice.
7. Operations **Submit Notice** → ticket `TG-IP-72842` (simulated).
8. **Simulate Removal** → case enters **Reappearance Monitoring** (not closed).
9. On **Reappearance Radar**, click **Simulate Reappearance**.
10. Platform detects `FND-2026-1148` at a new URL, links it, updates repeat-offender risk, and requires human confirm + reopen. It does **not** auto-send a new notice.

Admin → **Run Full Anti-Piracy Story** executes the loop in one action.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Mock vs real

**Mocked:** web / Telegram / marketplace / cloud discovery, AI similarity, forecasts, external notice submission, platform responses, reappearance crawler.

**Real in this prototype:** RBAC, navigation, dashboards, case lifecycle, evidence records + SHA-256 verification, four-gate validation, legal/notice approvals, workflow transitions, SLA, escalation, monitoring states, reappearance linking, repeat-offender scoring, audit, analytics, reports/export, configuration, search, role-based UI.

### Replacing mock connectors

Implement `DiscoveryConnector` (`discover / normalize / deduplicate / score / persist`) in `lib/connectors.ts`. Production adapters (authorized search APIs, platform partner APIs, marketplace feeds) should replace `MockTelegramConnector`, `MockWebConnector`, `MockMarketplaceConnector`, and `MockCloudStorageConnector` without changing workflow or UI.

The same pattern applies to `AIService` in `lib/ai.ts`.

## Security considerations

- Tenant id on every major entity (`tenant_id = SCHAND` in the demo).
- RBAC enforced in workflow services (not only in the UI).
- Session cookie is httpOnly.
- Security headers set in `next.config.ts`.
- No secrets in source; future integrations via env.
- Prototype must not — and does not — include CAPTCHA bypass, auth bypass, paywall circumvention, or exploit tooling. Monitoring is assumed to be **authorized and lawful**.

## AI architecture

`MockAIService` returns structured assessments (recommendation, confidence, model, version, prompt version, timestamp, inputs, methodology). All financial and forecast figures expose methodology and are labelled synthetic.

## Deployment architecture (future)

- App + API on a private VPC
- Postgres (tenant-aware) replacing the JSON store
- Object storage with WORM/immutability for evidence
- Enterprise SSO
- Secrets vault
- SIEM audit export
- Authorized connector workers, not in-process mocks

## Known limitations

- Single-process in-memory store (not multi-instance safe).
- Exports are local JSON/CSV (not typeset PDF).
- India “map” is a regional bar chart.
- Discovery jobs complete synchronously with a progress UI on Radar/Admin.

## Future roadmap

Brand / trademark / counterfeit modules · real OCR & document similarity · partner platform APIs · immutable evidence storage · SSO · production observability.

## Design system

[`docs/design.md`](docs/design.md) — KPMG × Knexus.AI starter, applied with S. Chand tenant identity.
