/**
 * Content for the Architecture page's "Platform Architecture" tab: the
 * platform drawn top to bottom as seven layers, with where AI acts, where a
 * person must approve, and why each part matters.
 *
 * Every block maps to real code in this repo. When a module is added or
 * renamed, update the matching entry here so the diagram stays accurate.
 */

export type ArchIcon =
  | 'bot' | 'users' | 'search' | 'upload' | 'sliders' | 'database' | 'target' | 'layers'
  | 'link' | 'file' | 'trend' | 'briefcase' | 'shield' | 'gavel' | 'send' | 'radar' | 'chart' | 'globe';

export interface ArchBox {
  /** Key into ARCH_DETAILS, opened when the box is clicked. */
  key: string;
  title: string;
  icon: ArchIcon;
  ai?: boolean;
  /** The lib/ai.ts function behind an AI-layer box. */
  fn?: string;
  /** Component chips. Suffix "|ai" marks an AI component, "|gate" a human approval point. */
  items?: string[];
  why: string;
}

export interface ArchLayer {
  n: string;
  name: string;
  purpose: string;
  kpi: string;
  ai?: boolean;
  /** CSS grid-template-columns for the layer's boxes on desktop. */
  cols: string;
  /** What moves down the arrow to the next layer. */
  out?: string;
  /** A human approval gate on the arrow to the next layer. */
  gate?: { key: string; label: string; stat: string };
  boxes: ArchBox[];
}

export const ARCH_LAYERS: ArchLayer[] = [
  {
    n: '01', name: 'Access', purpose: 'Role-based entry and guidance', kpi: '6 roles', cols: '1.55fr 1fr',
    out: 'Role-scoped requests',
    boxes: [
      { key: 'kbot', title: 'AI Agent Chatbot — K.Bot', icon: 'bot', ai: true, items: ['Role-aware guidance', 'Platform navigation', 'Case "what next"', 'Quick starts'], why: 'Every role knows where to go next.' },
      { key: 'roles', title: 'Users & Roles', icon: 'users', items: ['Executive', 'Anti-Piracy Lead', 'Investigator', 'Legal', 'Operations', 'Admin'], why: 'Each role sees only what it may act on.' },
    ],
  },
  {
    n: '02', name: 'Ingestion', purpose: 'Every source, one intake', kpi: '4 crawlers + upload', cols: 'repeat(3, minmax(0, 1fr))',
    out: 'Raw findings',
    boxes: [
      { key: 'crawlers', title: 'AI Web Crawlers', icon: 'search', ai: true, items: ['Crawler A · Telegram', 'Crawler B · Web', 'Crawler C · Marketplace', 'Crawler D · Cloud Storage'], why: 'Continuous coverage across channels.' },
      { key: 'manual', title: 'Manual Input', icon: 'upload', items: ['Investigator discovery input', 'Dataset upload'], why: 'Captures leads the crawlers miss.' },
      { key: 'config', title: 'IT System Config', icon: 'sliders', items: ['SLA rules', 'Business logic', 'Notice templates', 'Admin & connectors'], why: 'Policy lives in config, not code.' },
    ],
  },
  {
    n: '03', name: 'Data Layer', purpose: 'Single source of truth', kpi: '486 findings', cols: '1fr',
    out: 'Deduplicated findings',
    boxes: [
      { key: 'data', title: 'Findings Repository — all findings accumulated', icon: 'database', items: ['Findings from all sources', 'Normalize', 'Deduplicate by URL', 'Historical records', 'Repeat-offender graph|ai'], why: 'One deduplicated record per finding, with its full history.' },
    ],
  },
  {
    n: '04', name: 'AI Intelligence', purpose: 'Recommends, never decides', kpi: '5 AI services', ai: true, cols: 'repeat(5, minmax(0, 1fr))',
    gate: { key: 'gateInvestigator', label: 'Human gate · Investigator validates', stat: '312 of 486 pass (64%)' },
    boxes: [
      { key: 'classify', title: 'Classification & Match', icon: 'target', fn: 'classifyFinding', why: 'Is this really our title?' },
      { key: 'priority', title: 'Priority & Risk', icon: 'layers', fn: 'recommendPriority', why: 'What to work on first.' },
      { key: 'similarity', title: 'Similarity & Reappearance', icon: 'link', fn: 'calculateSimilarity', why: 'Links re-uploads to past cases.' },
      { key: 'route', title: 'Notice Route & Draft', icon: 'file', fn: 'recommendNoticeRoute', why: 'Right notice, right channel.' },
      { key: 'forecast', title: 'Exposure Forecast', icon: 'trend', fn: 'forecastExposure', why: 'Revenue at risk ahead.' },
    ],
  },
  {
    n: '05', name: 'Case & Evidence', purpose: 'Traceable, defensible decisions', kpi: '184 cases', cols: '1fr 1fr',
    out: 'Validated cases with hashed evidence',
    boxes: [
      { key: 'cases', title: 'Case Management Solution', icon: 'briefcase', items: ['E2E case workflow', 'Permission-checked steps', 'Immutable audit history|gate', 'Case summary|ai'], why: 'No case moves without a logged decision.' },
      { key: 'evidence', title: 'Evidence Vault', icon: 'shield', items: ['Storage · SHA-256', 'Validation', 'Chain of custody'], why: 'Evidence stays defensible.' },
    ],
  },
  {
    n: '06', name: 'Legal & Enforcement', purpose: 'AI drafts, legal decides', kpi: '156 notices → 138 removed', cols: '1.2fr 1fr 1fr',
    out: 'Takedown outcomes',
    boxes: [
      { key: 'legal', title: 'Legal Agent', icon: 'gavel', ai: true, items: ['Draft notice generator|ai', 'Rights validation · 4 gates', 'Legal sign-off|gate'], why: 'AI drafts; legal signs off.' },
      { key: 'enforcement', title: 'Enforcement', icon: 'send', items: ['Notice dispatch', 'SLA tracking', 'Escalation'], why: '2.1-day average removal.' },
      { key: 'radar', title: 'Reappearance Radar', icon: 'radar', ai: true, items: ['Post-removal monitoring', 'Link to original case', 'Reopen case'], why: 'Catches copies that come back.' },
    ],
  },
  {
    n: '07', name: 'Reporting', purpose: 'Enforcement as business value', kpi: '11 report types', cols: 'repeat(3, minmax(0, 1fr))',
    boxes: [
      { key: 'reports', title: 'Standard Report Creation', icon: 'file', items: ['11 report types', 'Weekly enforcement', 'Legal action', 'Audit'], why: 'Consistent numbers everywhere.' },
      { key: 'cxo', title: 'CXO View', icon: 'chart', items: ['KPI / KRI pack', '₹18.6 Cr exposure', 'Drill-down insights'], why: 'Revenue at risk for leadership.' },
      { key: 'llm', title: 'LLM Exposure Intelligence', icon: 'globe', ai: true, items: ['4 models probed', '2,000 executions', 'Reconstruction risk'], why: 'A new piracy channel, tracked.' },
    ],
  },
];

export const ARCH_GOVERNANCE: { title: string; detail: string }[] = [
  { title: 'Role-based access', detail: '6 roles, enforced in services' },
  { title: 'Human-in-the-loop', detail: 'AI recommends; people approve' },
  { title: 'Immutable audit trail', detail: 'Every decision logged, before and after' },
  { title: 'Tenant isolation', detail: 'All records scoped to SCHAND' },
  { title: 'Secure sessions', detail: 'JWT, 12-hour expiry, httpOnly' },
  { title: 'Evidence integrity', detail: 'SHA-256 chain of custody' },
];

export interface ArchDetail {
  title: string;
  module: string;
  ai: string;
  human: string;
  why: string;
}

export const ARCH_DETAILS: Record<string, ArchDetail> = {
  governance: { title: 'Governance & Security', module: 'lib/rbac.ts · lib/auth.ts · lib/workflow.ts audit · lib/hash.ts', ai: 'None.', human: 'Permissions are enforced in services, not just hidden in the UI. Every change writes an audit event.', why: 'The controls that make the whole architecture trustworthy for a legal enforcement program.' },
  kbot: { title: 'AI Agent Chatbot — K.Bot', module: 'lib/kbot.ts · lib/kbot-knowledge.ts', ai: 'Role-aware intent matching, plus case-aware "what should I do next" guidance on any case page.', human: 'Advises only. It never validates, approves or sends anything.', why: 'Every role knows where to go and what to do next without training or a manual.' },
  roles: { title: 'Users & Roles', module: 'AppShell · NAV_GROUPS · lib/rbac.ts', ai: 'None.', human: 'Six roles; each sees only the pages and actions its permissions allow.', why: 'Separation of duties: investigators cannot approve legal action, executives cannot change cases.' },
  crawlers: { title: 'AI Web Crawlers', module: 'lib/connectors.ts — Telegram, Web, Marketplace, Cloud Storage connectors', ai: 'Every finding is scored at intake (match score, AI confidence).', human: 'None at intake. Findings wait for investigator validation.', why: 'Coverage. Telegram alone holds 48 of 142 active cases, so continuous scanning finds copies before they spread.' },
  manual: { title: 'Manual Input', module: 'Upload Dataset (discovery/upload) · investigator notes', ai: 'Uploaded findings get the same scoring as crawler findings.', human: 'Investigator-initiated.', why: 'Brings in leads the crawlers miss: author reports, school tips, partner exports.' },
  config: { title: 'IT System Config', module: 'Configuration and Administration pages', ai: 'None. Rules are set by people.', human: 'Administrator and Anti-Piracy Lead only.', why: 'SLA hours, escalation triggers, notice templates and AI model settings live in configuration, so policy changes need no release.' },
  data: { title: 'Data Layer — Findings Repository', module: 'Findings store · URL deduplication · entity relationships', ai: 'repeatOffenderScore links new findings to known uploaders and past cases.', human: 'None.', why: 'One deduplicated record of every finding and its full history, so nothing is chased twice.' },
  classify: { title: 'Classification & Match', module: 'lib/ai.ts · classifyFinding', ai: 'Classifies each finding against the protected catalogue and scores the match.', human: 'Shown to the investigator as a recommendation, never applied automatically.', why: 'Separates real copies of S. Chand titles from look-alikes.' },
  priority: { title: 'Priority & Risk', module: 'lib/ai.ts · recommendPriority · lib/sla.ts', ai: 'Sets priority from match score, platform and whether it is a flagship title.', human: 'Investigators and leads can reorder work.', why: 'Investigator time goes to the five flagship titles and critical cases first.' },
  similarity: { title: 'Similarity & Reappearance', module: 'lib/ai.ts · calculateSimilarity · simulateReappearance', ai: 'Compares text, visual, metadata and watermark signals to link re-uploads to the original case.', human: 'An investigator confirms each link. No second notice is sent automatically.', why: '16 resurfaced items were caught and linked back to their original cases.' },
  route: { title: 'Notice Route & Draft', module: 'lib/ai.ts · recommendNoticeRoute · generateNotice', ai: 'Recommends the route (platform IP form, US DMCA, India intermediary) and drafts the notice.', human: 'Legal reviews, edits and approves before anything is sent.', why: 'Faster notices without losing legal control.' },
  forecast: { title: 'Exposure Forecast', module: 'lib/ai.ts · forecastExposure', ai: 'Projects piracy exposure over the coming weeks.', human: 'Labelled as a scenario, not a fact.', why: 'Warns leadership of exam-season spikes (W12 index up 18%).' },
  gateInvestigator: { title: 'Human gate — Investigator validates', module: 'findings/validate · confirmInfringement', ai: 'The AI recommendation is shown, not applied.', human: 'An investigator validates or rejects each finding before a case exists.', why: 'Stops false positives before any case, evidence package or notice is created. 312 of 486 detections (64%) pass.' },
  cases: { title: 'Case Management Solution', module: 'CaseWorkflowService · audit events', ai: 'summarizeCase condenses the case for reviewers.', human: 'Every status change is permission-checked and written to the immutable audit log.', why: 'No case moves without a traceable, accountable decision.' },
  evidence: { title: 'Evidence Vault', module: 'SHA-256 hashing · chain-of-custody events · verifyEvidenceHash', ai: 'None.', human: 'The hash is verified before legal review.', why: 'Evidence stays defensible if a takedown is challenged.' },
  legal: { title: 'Legal Agent', module: 'recommendNoticeRoute · generateNotice · approveRights (four gates) · approveLegal', ai: 'Drafts the notice and recommends its route.', human: 'A Legal Reviewer must pass all four rights gates, approve legal action and approve the notice.', why: 'AI drafts; people decide. No notice leaves without accountable legal approval.' },
  enforcement: { title: 'Enforcement', module: 'submitNotice · recordResponse · SLA rules · escalation', ai: 'None.', human: 'Platform Operations submits. SLA breaches escalate to Lead and Legal.', why: 'Removal time and SLA breaches become measurable: 2.1-day average removal, 7.2% breach rate.' },
  radar: { title: 'Reappearance Radar', module: 'Reappearance Radar · monitoring jobs · reopenCase', ai: 'Similarity matching finds re-uploads and mirrors of removed content.', human: 'An investigator confirms the link and decides whether to reopen.', why: 'Closes the loop: resurfaced copies go back to the data layer with their history attached.' },
  reports: { title: 'Standard Report Creation', module: 'lib/metrics.ts · buildReport (11 report types)', ai: 'None in report assembly.', human: 'Read-only.', why: 'Every report draws on the same numbers, so charts, cards and narrative agree.' },
  cxo: { title: 'CXO View', module: 'Overview page · executiveOverview · drill-down modals', ai: 'The exposure forecast feeds the trend view.', human: 'Read-only.', why: 'Turns enforcement into revenue at risk (₹18.6 Cr) and program ROI for the CFO.' },
  llm: { title: 'LLM Exposure Intelligence', module: 'LLM Exposure page · lib/llm-probe.ts', ai: 'Red-team probes of four public models, judged for content reconstruction.', human: 'Read-only analysis.', why: 'Shows whether S. Chand content is being reproduced by public AI models, a new piracy channel.' },
};
