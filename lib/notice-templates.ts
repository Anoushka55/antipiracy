import type { AppState, CaseRecord, CatalogueAsset, Evidence, Finding, Notice, NoticeRoute } from "./types";
import { NOTICE_ROUTE_LABEL, RIGHTS_HOLDER_CONTACT } from "./constants";
import { classificationLabel, MockAIService } from "./ai";

/**
 * Formal takedown notices, written from S. Chand's four draft notices:
 * US Copyright – DMCA, Copyright Reporting (platform IP form), Intermediary
 * Notice (India) and Escalated Legal Notice. Each builder keeps its sample's
 * subject line, salutation, numbered sections, statutory wording and requested
 * actions, and fills every value from the case record. The few facts the
 * platform does not hold are marked for Legal to complete (see `todo`).
 */

export type NoticeTemplateId = "dmca" | "copyright_reporting" | "intermediary" | "escalated";

/** Which sample drafts a notice on each route. Registrar/hosting uses the escalated sample, which is addressed to host, registrar or upstream provider. */
export const TEMPLATE_FOR_ROUTE: Record<NoticeRoute, NoticeTemplateId> = {
  us_dmca: "dmca",
  platform_ip_form: "copyright_reporting",
  india_intermediary: "intermediary",
  escalated_legal: "escalated",
  registrar_hosting: "escalated",
};

export const TEMPLATE_LABEL: Record<NoticeTemplateId, string> = {
  copyright_reporting: "Copyright Reporting",
  dmca: "US Copyright – DMCA",
  intermediary: "Intermediary Notice (India)",
  escalated: "Escalated Legal Notice",
};

/** The route to regenerate a notice on when a template is chosen in the switcher. */
export const ROUTE_FOR_TEMPLATE: Record<NoticeTemplateId, NoticeRoute> = {
  copyright_reporting: "platform_ip_form",
  dmca: "us_dmca",
  intermediary: "india_intermediary",
  escalated: "escalated_legal",
};

export interface NoticeField {
  label: string;
  value: string;
}

export interface NoticeSection {
  heading: string;
  paragraphs?: string[];
  fields?: NoticeField[];
  bullets?: string[];
  /** Paragraphs that follow the fields or bullets. */
  after?: string[];
}

export interface NoticeDocument {
  noticeId: string;
  caseId: string;
  route: NoticeRoute;
  status: Notice["status"];
  templateId: NoticeTemplateId;
  templateName: string;
  subject: string;
  salutation: string;
  intro: string[];
  sections: NoticeSection[];
  closing: string[];
  signOff: string;
  signature: { name: string; title: string; company: string; email: string; telephone: string; address: string };
  references: NoticeField[];
  /** How many "[To be completed by Legal: …]" items remain. */
  openItems: number;
}

const TODO_PREFIX = "[To be completed by Legal: ";
const todo = (what: string) => `${TODO_PREFIX}${what}]`;
/** Matches a to-be-completed marker, so the UI can highlight it. */
export const TODO_PATTERN = /\[To be completed by Legal: [^\]]*\]/g;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "1 September 2026" (UTC). */
export function formatNoticeDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "1 September 2026, 08:12 UTC". */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatNoticeDate(iso)}, ${hh}:${mm} UTC`;
}

const EVIDENCE_LABEL: Record<Evidence["type"], string> = {
  pdf_binary: "preserved copy of the file",
  screenshot: "screenshot capture",
  metadata: "metadata record",
  html_capture: "captured page state",
  channel_snapshot: "channel snapshot",
};

interface Ctx {
  notice: Notice;
  rec: CaseRecord;
  asset?: CatalogueAsset;
  finding?: Finding;
  evidence: Evidence[];
  state: AppState;
}

function sentenceCase(label: string): string {
  const lower = label.toLowerCase().replace(/ — /g, " – ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Values every template draws on, resolved once from the case record. */
function facts(ctx: Ctx) {
  const { rec, asset, finding, evidence, notice } = ctx;
  const c = RIGHTS_HOLDER_CONTACT;
  const match = finding?.matchScore;
  const primary = evidence[0];
  const evidenceIds = evidence.length ? evidence.map((e) => e.id).join(", ") : todo("evidence ID");
  return {
    c,
    caseId: rec.id,
    title: asset?.title ?? rec.title,
    author: asset?.author ?? todo("author"),
    isbn: asset?.isbn ?? todo("ISBN"),
    edition: asset?.edition ? `${asset.edition} edition` : todo("edition"),
    segment: asset?.segment ?? todo("segment"),
    platform: rec.platform,
    uploader: rec.uploader,
    url: rec.url,
    discovered: formatDateTime(finding?.detectedAt ?? rec.createdAt),
    classification: sentenceCase(classificationLabel(match ?? 80)),
    priority: (match ?? 0) >= 95,
    matchText: match !== undefined ? `${match}% match score in the case system` : todo("similarity assessment"),
    matchShort: match !== undefined ? `${match}%` : todo("match score"),
    evidenceIds,
    hash: primary?.sha256 ?? todo("SHA-256 hash"),
    captured: primary ? formatDateTime(primary.capturedAt) : todo("capture date and time"),
    captureKinds: evidence.length ? [...new Set(evidence.map((e) => EVIDENCE_LABEL[e.type]))].join(", ") : todo("capture type"),
    repository: primary?.storageLocation ?? todo("evidence repository reference"),
    registration: todo("copyright registration number, if available"),
    routeLabel: NOTICE_ROUTE_LABEL[notice.route],
    date: formatNoticeDate(notice.generatedAt),
  };
}

type Facts = ReturnType<typeof facts>;

function number(sections: NoticeSection[]): NoticeSection[] {
  return sections.map((s, i) => ({ ...s, heading: `${i + 1}. ${s.heading}` }));
}

function signature(f: Facts) {
  return {
    name: f.c.representative,
    title: f.c.title,
    company: f.c.company,
    email: f.c.email,
    telephone: f.c.telephone,
    address: f.c.address,
  };
}

function references(f: Facts, notice: Notice): NoticeField[] {
  return [
    { label: "Case ID", value: f.caseId },
    { label: "Notice ID", value: notice.id },
    { label: "Date of notice", value: f.date },
  ];
}

// ---------------------------------------------------------------------------
// US Copyright – DMCA
// ---------------------------------------------------------------------------
function dmca(f: Facts): Pick<NoticeDocument, "subject" | "salutation" | "intro" | "sections" | "closing" | "signOff"> {
  return {
    subject: `DMCA Takedown Notice – ${f.title} – Case ${f.caseId}`,
    salutation: "Dear Designated DMCA Agent / Copyright Agent,",
    intro: [
      `I write on behalf of ${f.c.company} (“${f.c.shortName}”), the copyright owner of the work identified below, to provide formal notification of claimed copyright infringement under 17 U.S.C. § 512(c)(3).`,
      "We request that the relevant service provider expeditiously remove or disable access to the identified material that is being made available through its service without authorization.",
    ],
    sections: number([
      {
        heading: "Case and Copyrighted Work Information",
        fields: [
          { label: "Case ID", value: f.caseId },
          { label: "Notice route", value: f.routeLabel },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "Source URL", value: f.url },
          { label: "Date/time discovered", value: f.discovered },
          { label: "Copyright owner", value: f.c.company },
          { label: "Publication title", value: f.title },
          { label: "Author", value: f.author },
          { label: "Segment", value: f.segment },
          { label: "ISBN", value: f.isbn },
          { label: "Edition", value: f.edition },
          { label: "Copyright registration", value: f.registration },
        ],
        after: [`The above publication is a copyrighted work in which ${f.c.company} owns or is authorized to enforce the relevant copyright rights.`],
      },
      {
        heading: "Identification and Location of Infringing Material",
        paragraphs: [`The suspected infringing material has been identified on ${f.platform} under the account/channel identifier ${f.uploader}.`],
        fields: [
          { label: "Infringing URL", value: f.url },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
        ],
        after: [
          `Description of infringement: the identified ${f.platform} posting appears to make available material corresponding to ${f.title} by ${f.author}, published by ${f.c.company}, including material associated with the identified ISBN ${f.isbn}.`,
          `The material is being made available through the identified ${f.platform} source without authorization from ${f.c.company} or its authorized representative.`,
        ],
      },
      {
        heading: "Supporting Evidence",
        paragraphs: [`The infringement has been recorded under Case ID ${f.caseId}. The case record identifies:`],
        fields: [
          { label: "Source URL", value: f.url },
          { label: "Platform", value: f.platform },
          { label: "Uploader", value: f.uploader },
          { label: "Discovery timestamp", value: f.discovered },
          { label: "Identified work", value: `${f.title} by ${f.author}` },
          { label: "ISBN", value: f.isbn },
          { label: "Case classification", value: f.classification },
          { label: "Similarity assessment", value: f.matchText },
          { label: "Evidence repository reference", value: `${f.evidenceIds} · ${f.repository}` },
          { label: "SHA-256 file hash", value: f.hash },
          { label: "Capture / forensic record", value: `${f.captureKinds}, captured ${f.captured}` },
        ],
        after: [
          "The underlying evidence is retained in the designated evidence repository together with its chain-of-custody information, including capture time, collector/system information, source URL and integrity information.",
        ],
      },
      {
        heading: "Copyright Owner and Authorized Representative",
        fields: [
          { label: "Copyright owner", value: f.c.company },
          { label: "Authorized representative", value: f.c.representative },
          { label: "Title / capacity", value: f.c.title },
          { label: "Address", value: f.c.address },
          { label: "Telephone", value: f.c.telephone },
          { label: "Email", value: f.c.email },
        ],
      },
      {
        heading: "Good-Faith Statement",
        paragraphs: [
          "I have a good-faith belief that the use of the copyrighted material identified in this notification, in the manner described above, is not authorized by the copyright owner, its authorized agent, or the law.",
        ],
      },
      {
        heading: "Accuracy and Authority Statement",
        paragraphs: [
          "I declare, under penalty of perjury, that the information contained in this notification is accurate and that I am authorized to act on behalf of the copyright owner with respect to the exclusive rights allegedly infringed.",
        ],
      },
      {
        heading: "Requested Action",
        paragraphs: ["Accordingly, we request that the service provider take appropriate action in respect of the specifically identified material, including:"],
        bullets: [
          "Remove or disable access to the identified infringing material;",
          "Take appropriate steps, where technically applicable, to prevent continued access to the specifically identified material; and",
          "Confirm completion of the requested action by reply to this email.",
        ],
        after: [
          "Please preserve any information reasonably necessary to identify the relevant account, posting, upload or other source associated with the identified material, subject to applicable law and your retention policies.",
          "This notification relates specifically to the material and location identified above. If additional information is required to locate or process the reported material, please contact the undersigned.",
        ],
      },
    ]),
    closing: [],
    signOff: "Sincerely,",
  };
}

// ---------------------------------------------------------------------------
// Copyright Reporting (platform IP form)
// ---------------------------------------------------------------------------
function natureOfInfringement(ctx: Ctx): string {
  const cat = ctx.finding?.platformCategory;
  if (cat === "marketplace") return "Unauthorised sale and distribution of a digital copy";
  if (cat === "cloud_storage" || cat === "cyberlocker") return "Full-text unauthorised digital copy made available for download";
  if (cat === "messaging") return "Full-text upload distributed to channel members (making available / communication to the public)";
  return "Unauthorised reproduction and making available to the public";
}

function copyrightReporting(f: Facts, ctx: Ctx): Pick<NoticeDocument, "subject" | "salutation" | "intro" | "sections" | "closing" | "signOff"> {
  return {
    subject: `Copyright Infringement Notice – ${f.title} by ${f.author} – Case ${f.caseId}`,
    salutation: "Dear Copyright / Intellectual Property Enforcement Team,",
    intro: [
      `I write on behalf of ${f.c.company}, the rights holder in respect of the copyrighted work identified below, to report suspected unauthorised reproduction, distribution and/or making available of copyrighted material through your platform.`,
      `This notice concerns Case ID ${f.caseId} and is submitted for review and appropriate enforcement action under ${f.platform}'s applicable copyright and intellectual property reporting procedures.`,
    ],
    sections: number([
      {
        heading: "Rights Holder / Complainant",
        fields: [
          { label: "Rights holder", value: f.c.company },
          { label: "Authorised representative", value: f.c.representative },
          { label: "Designation / capacity", value: f.c.title },
          { label: "Relationship to rights holder", value: "Authorised in-house representative" },
          { label: "Email", value: f.c.email },
          { label: "Telephone", value: f.c.telephone },
          { label: "Registered / mailing address", value: f.c.address },
        ],
      },
      {
        heading: "Copyrighted Work",
        paragraphs: ["The work identified as the subject of this complaint is:"],
        fields: [
          { label: "Title", value: f.title },
          { label: "Author", value: f.author },
          { label: "Segment / edition", value: `${f.segment} · ${f.edition}` },
          { label: "ISBN", value: f.isbn },
          { label: "Copyright registration / other rights reference", value: f.registration },
          { label: "Publisher", value: f.c.company },
        ],
        after: [`${f.c.company} asserts the applicable rights in the above work, subject to the supporting rights documentation maintained in the relevant case file.`],
      },
      {
        heading: "Reported Infringing Material",
        paragraphs: [`The suspected unauthorised material was identified on ${f.platform} as follows:`],
        fields: [
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "Reported source URL", value: f.url },
          { label: "Date/time discovered", value: f.discovered },
          { label: "Nature of reported infringement", value: natureOfInfringement(ctx) },
        ],
        after: [
          `The material available at the above location appears to reproduce and/or make available material corresponding to the copyrighted work ${f.title} by ${f.author}, including identifying characteristics associated with the work.`,
          f.priority
            ? "The reported content has been assessed as a priority title exposure within the relevant case workflow."
            : `The reported content has been assessed as “${f.classification}” within the relevant case workflow.`,
        ],
      },
      {
        heading: "Evidence Supporting the Complaint",
        paragraphs: [`The complaint is supported by evidence preserved under Case ID ${f.caseId}, including:`],
        fields: [
          { label: "Evidence ID", value: f.evidenceIds },
          { label: "Source URL captured", value: f.url },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "Capture date/time", value: f.captured },
          { label: "Captured material", value: f.captureKinds },
          { label: "SHA-256 hash", value: f.hash },
          { label: "Evidence repository", value: f.repository },
          { label: "Case record", value: f.caseId },
        ],
        after: [
          "The evidence has been preserved in accordance with the applicable internal evidence-handling and chain-of-custody process, including recording of the source, capture time, custodian and relevant integrity information.",
        ],
      },
      {
        heading: "Basis of the Complaint",
        paragraphs: [
          "Based on the information and evidence presently available, the reported material appears to involve unauthorised use of material from the identified copyrighted work.",
          `${f.c.company} has not authorised ${f.uploader}, the relevant uploader, or any other person responsible for the reported posting to reproduce, distribute, upload, communicate, transmit, or otherwise make the copyrighted material available through ${f.platform}.`,
          "Good-faith statement: I have a good-faith belief that the use of the identified material described in this notice is not authorised by the copyright owner, its authorised representative, or applicable law.",
        ],
      },
      {
        heading: "Requested Platform Action",
        paragraphs: [`In light of the above, we respectfully request that ${f.platform}:`],
        bullets: [
          "Review the reported content and the supporting information provided with this notice;",
          `Remove, disable access to, or otherwise take appropriate action against the reported infringing material in accordance with ${f.platform}'s applicable copyright/IP procedures;`,
          "Take appropriate action in respect of the account, channel, post, file, or other content identifier associated with the reported material, where warranted under the platform's policies;",
          "Take reasonable steps to prevent the same identified material from being re-uploaded or made available through the same account/channel where such measures are available under the platform's procedures; and",
          "Confirm the action taken in relation to this report, including the relevant reference/ticket number.",
        ],
        after: ["Where additional information, documentation or verification is required to process this complaint, please contact the undersigned using the details below."],
      },
      {
        heading: "Accuracy and Authority",
        paragraphs: [`I confirm that the information contained in this notice is accurate to the best of my knowledge and that I am authorised to submit this complaint on behalf of ${f.c.company}.`],
        fields: [
          { label: "Authorised representative", value: f.c.representative },
          { label: "Designation", value: f.c.title },
          { label: "Authority / authorisation reference", value: `Authorised signatory of ${f.c.company} for anti-piracy enforcement` },
          { label: "Email", value: f.c.email },
          { label: "Telephone", value: f.c.telephone },
        ],
      },
      {
        heading: "Attachments / Supporting Material",
        paragraphs: ["The following supporting material is held under the evidence references above and is available on request:"],
        bullets: [
          `Screenshot(s) of the reported ${f.platform} content (${f.evidenceIds});`,
          `Evidence capture / forensic record, with SHA-256 hash ${f.hash};`,
          "Representative extract of the copyrighted work;",
          "Rights-holder ownership documentation;",
          `Content-correlation record (${f.matchShort} match against the catalogue title); and`,
          "Copyright registration or publication documentation.",
        ],
      },
    ]),
    closing: ["We request that this complaint be processed through your applicable copyright/IP enforcement channel and that the reported material be reviewed and acted upon accordingly."],
    signOff: "Yours faithfully,",
  };
}

// ---------------------------------------------------------------------------
// Intermediary Notice (India)
// ---------------------------------------------------------------------------
function intermediary(f: Facts): Pick<NoticeDocument, "subject" | "salutation" | "intro" | "sections" | "closing" | "signOff"> {
  return {
    subject: `Notice of Copyright Infringement and Request for Takedown – ${f.caseId} – ${f.title}`,
    salutation: "Dear Grievance Officer / Designated IP Contact,",
    intro: [
      `Re: Notice of copyright infringement and request for takedown – Case ${f.caseId}`,
      `We write on behalf of ${f.c.company} (“${f.c.shortName}”), the copyright owner of the work identified below, in relation to unauthorized online availability and distribution of the copyrighted work through the identified platform/account.`,
      "This notice is issued pursuant to the applicable provisions of the Copyright Act, 1957 and, where applicable to the recipient and the circumstances of the reported content, the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, as amended.",
      "We request that the identified material be removed or access to it be disabled through the appropriate platform/intermediary mechanism and that the relevant records be preserved pending resolution of this matter.",
    ],
    sections: number([
      {
        heading: "Case Information",
        fields: [
          { label: "Case ID", value: f.caseId },
          { label: "Notice route", value: f.routeLabel },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "Source / content URL", value: f.url },
          { label: "Discovery timestamp", value: f.discovered },
          { label: "Case assessment", value: f.classification },
          { label: "System match score", value: f.matchShort },
        ],
      },
      {
        heading: "Copyright Owner and Work",
        fields: [
          { label: "Rights holder", value: f.c.company },
          { label: "Publication", value: f.title },
          { label: "Author", value: f.author },
          { label: "Segment", value: f.segment },
          { label: "ISBN", value: f.isbn },
          { label: "Edition", value: f.edition },
          { label: "Copyright registration", value: f.registration },
        ],
        after: [`${f.c.company} is the identified rights holder and/or authorized entity entitled to enforce the applicable copyright interests in the above work.`],
      },
      {
        heading: "Identification of Infringing Content",
        paragraphs: [`The reported material is available through the following ${f.platform} source:`],
        fields: [
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "URL", value: f.url },
        ],
        after: [
          `The identified posting appears to make available material corresponding to ${f.title} by ${f.author}, identified by ISBN ${f.isbn}, without authorization from ${f.c.company} or its authorized representative.`,
          "The reported conduct involves the unauthorized reproduction, distribution, communication to the public, and/or making available of copyrighted material through the identified online source, to the extent established by the preserved evidence.",
          "The reported material therefore concerns rights protected under the Copyright Act, 1957, subject to any applicable statutory exception or other lawful authorization.",
        ],
      },
      {
        heading: "Statement of Unauthorized Use",
        paragraphs: [
          `${f.c.company} has not authorized the identified uploader/account to reproduce, distribute, communicate to the public, or otherwise make the identified copyrighted material available through the reported source.`,
          `To the best of the rights holder's knowledge, the reported use is not licensed or otherwise authorized by ${f.c.company}, its authorized agents, or by operation of law.`,
        ],
      },
      {
        heading: "Supporting Evidence",
        paragraphs: [`The infringement assessment and supporting material have been recorded under Case ID ${f.caseId}. The case record contains the following evidence:`],
        fields: [
          { label: "Source URL", value: f.url },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account", value: f.uploader },
          { label: "Discovery timestamp", value: f.discovered },
          { label: "Copyrighted work", value: f.title },
          { label: "Author", value: f.author },
          { label: "ISBN", value: f.isbn },
          { label: "Case classification", value: f.classification },
          { label: "Similarity / match assessment", value: f.matchShort },
          { label: "Evidence ID", value: f.evidenceIds },
          { label: "Evidence repository", value: f.repository },
          { label: "Capture reference", value: `${f.captureKinds}, captured ${f.captured}` },
          { label: "File hash (SHA-256)", value: f.hash },
        ],
        after: [
          "The underlying evidence is preserved in its original form, together with the applicable capture timestamp, source information, integrity/hash information and chain-of-custody records.",
        ],
      },
      {
        heading: "Request for Intermediary Action",
        paragraphs: ["In light of the above, we request that the recipient:"],
        bullets: [
          "Remove or disable access to the specifically identified infringing content through the appropriate grievance, copyright or intermediary mechanism;",
          "Take appropriate steps in relation to the identified account/source where warranted by the platform's policies and applicable law;",
          "Preserve the identified content and associated records in a manner that does not compromise the evidentiary record, including relevant account, upload, posting and access information, subject to applicable law;",
          "Confirm receipt and processing of this notice; and",
          "Confirm the action taken in respect of the identified URL/content.",
        ],
        after: ["Where the recipient considers that additional information, documentation or verification is required, please notify us promptly so that the same may be provided."],
      },
      {
        heading: "Accuracy and Authority Statement",
        paragraphs: [
          `I confirm that the information contained in this notice is true and accurate to the best of my knowledge and that I am duly authorized to act on behalf of ${f.c.company} in this matter.`,
        ],
      },
      {
        heading: "Rights Holder Contact Details",
        fields: [
          { label: "Rights holder", value: f.c.company },
          { label: "Authorized representative", value: f.c.representative },
          { label: "Designation", value: f.c.title },
          { label: "Email", value: f.c.email },
          { label: "Telephone", value: f.c.telephone },
        ],
      },
    ]),
    closing: ["We request your prompt attention to this notice and written confirmation of the action taken."],
    signOff: "Yours faithfully,",
  };
}

// ---------------------------------------------------------------------------
// Escalated Legal Notice (also used for registrar / hosting escalation)
// ---------------------------------------------------------------------------
function enforcementHistory(ctx: Ctx): string[] {
  const { state, rec } = ctx;
  const lines: string[] = [];
  state.submissions
    .filter((s) => s.caseId === rec.id)
    .forEach((s) => lines.push(`Notice submitted ${formatDateTime(s.submittedAt)} via ${s.destination} (ticket ${s.ticketId}); status: ${s.status.replace(/_/g, " ")}.`));
  state.platformResponses
    .filter((r) => r.caseId === rec.id)
    .forEach((r) => lines.push(`Platform response received ${formatDateTime(r.receivedAt)}: ${r.outcome.replace(/_/g, " ")}.`));
  state.escalations
    .filter((e) => e.caseId === rec.id)
    .forEach((e) => lines.push(`Escalated ${formatDateTime(e.createdAt)}: ${e.reason}.`));
  const reapps = state.reappearances.filter((r) => r.originalCaseId === rec.id);
  if (reapps.length) lines.push(`${reapps.length} reappearance${reapps.length === 1 ? "" : "s"} of the removed material linked back to this case.`);
  return lines;
}

function escalated(f: Facts, ctx: Ctx): Pick<NoticeDocument, "subject" | "salutation" | "intro" | "sections" | "closing" | "signOff"> {
  const history = enforcementHistory(ctx);
  const recommended = NOTICE_ROUTE_LABEL[MockAIService.recommendNoticeRoute(ctx.rec.platform).route];
  return {
    subject: `Escalated Notice of Copyright Infringement – ${f.title} – Case ${f.caseId}`,
    salutation: "Dear Hosting Provider / Registrar / Upstream Provider / Legal Contact,",
    intro: [
      `We write on behalf of ${f.c.company}, the rights holder in the copyrighted work identified below, to formally notify you of suspected unauthorised use and distribution of copyrighted material associated with the following matter.`,
      `Re: Escalated notice of copyright infringement – Case ${f.caseId}`,
    ],
    sections: number([
      {
        heading: "Rights Holder and Authorised Representative",
        fields: [
          { label: "Rights holder", value: f.c.company },
          { label: "Authorised representative", value: `${f.c.representative}, ${f.c.title}` },
          { label: "For and on behalf of", value: f.c.company },
          { label: "Email", value: f.c.email },
          { label: "Telephone", value: f.c.telephone },
        ],
      },
      {
        heading: "Copyrighted Work",
        fields: [
          { label: "Publication", value: f.title },
          { label: "Author", value: f.author },
          { label: "Series / segment", value: f.segment },
          { label: "ISBN", value: f.isbn },
          { label: "Edition", value: f.edition },
          { label: "Copyright registration", value: f.registration },
        ],
        after: [
          `${f.c.company} asserts rights in the above work. The material identified below appears to reproduce, distribute, communicate, or otherwise make available protected content without the rights holder's authorisation.`,
        ],
      },
      {
        heading: "Infringing Material and Location",
        fields: [
          { label: "Source URL", value: f.url },
          { label: "Platform", value: f.platform },
          { label: "Uploader / account identifier", value: f.uploader },
        ],
        after: [
          `Description of suspected infringement: the identified ${f.platform} location appears to make the above publication available without authorisation. The case record identifies the matter as “${f.classification}” involving the ${f.title} publication.`,
          "The identified material and associated account/location should be reviewed against the copyrighted work and the supporting evidence maintained in the case file.",
        ],
      },
      {
        heading: "Prior Enforcement / Escalation History",
        paragraphs: [`The matter is being escalated through the cross-border/legal route following the enforcement workflow recorded for Case ${f.caseId}.`],
        fields: [
          { label: "Case ID", value: f.caseId },
          { label: "Detection / discovery record", value: f.discovered },
          { label: "Platform", value: f.platform },
          { label: "Notice route previously identified", value: recommended },
          { label: "Current status", value: ctx.rec.status.replace(/_/g, " ") },
        ],
        bullets: history.length ? history : undefined,
        after: history.length
          ? undefined
          : ["No prior notice has been dispatched for this case; this notice is issued directly through the escalated route."],
      },
      {
        heading: "Evidence and Chain of Custody",
        paragraphs: ["The supporting evidence has been preserved under the above Case ID in the internal evidence repository. The evidence package includes:"],
        bullets: [
          "Capture of the complete source URL and relevant page/channel state;",
          "Screenshots showing the identified material, title and uploader/account information;",
          `Capture date and time recorded in UTC (${f.captured});`,
          "Preserved copies of the relevant material where legally and technically permissible;",
          `Content correlation against the authoritative ${f.c.shortName} publication, including title, ISBN, edition and author (${f.matchShort} match);`,
          `File integrity information, including SHA-256 hash ${f.hash}; and`,
          "Access, transfer and preservation records maintained in accordance with the applicable evidence-retention process.",
        ],
        fields: [{ label: "Internal evidence reference", value: `${f.evidenceIds} · ${f.repository}` }],
      },
      {
        heading: "Applicable Legal Basis",
        paragraphs: ["This notice is submitted as an escalated/cross-border copyright enforcement communication."],
        fields: [
          { label: "Jurisdiction of rights holder", value: f.c.jurisdiction },
          { label: "Jurisdiction of recipient / hosting / service provider", value: todo(`recipient jurisdiction; hosting country recorded for this case: ${ctx.rec.hostingCountry}`) },
          { label: "Applicable statutory / contractual / platform basis", value: todo("statutory basis and notice-and-takedown mechanism") },
        ],
        after: ["The specific statutory provisions, notice-and-takedown mechanism and jurisdictional basis must be confirmed by Legal before this notice is submitted."],
      },
      {
        heading: "Requested Action",
        paragraphs: ["We request that you:"],
        bullets: [
          "Remove or disable access to the identified infringing material and associated location/account content, to the extent within your control;",
          "Take reasonable steps to prevent continued availability of the identified material through the same service where permitted under the applicable process;",
          "Preserve relevant account, access and content records associated with the identified material pending further legal action, where applicable and lawful; and",
          "Provide written confirmation of the action taken, including the date and scope of removal or restriction.",
        ],
        after: [
          "Please confirm the action taken, or provide the applicable basis for declining action, within ten (10) business days of receipt of this notice or such other period as the applicable law requires.",
          `Nothing in this notice should be construed as a waiver of any rights or remedies available to ${f.c.company}, all of which are expressly reserved.`,
        ],
      },
      {
        heading: "Good-Faith and Accuracy Statements",
        paragraphs: [
          `We have a good-faith belief that the use of the copyrighted material identified in this notice is not authorised by ${f.c.company}, its agents, or applicable law.`,
          `To the best of our knowledge, the information contained in this notice and the accompanying evidence is accurate, and the undersigned is authorised to act on behalf of ${f.c.company} in relation to this matter.`,
          `Please direct any acknowledgement, request for clarification or confirmation of action to ${f.c.representative}, ${f.c.title}, at ${f.c.email} or ${f.c.telephone}.`,
        ],
      },
    ]),
    closing: [],
    signOff: "Regards,",
  };
}

/** Counts the "[To be completed by Legal: …]" markers left in a document. */
function countOpenItems(doc: Omit<NoticeDocument, "openItems">): number {
  const text = [
    doc.subject,
    doc.salutation,
    ...doc.intro,
    ...doc.closing,
    ...doc.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.after ?? []), ...(s.fields ?? []).map((x) => x.value)]),
  ].join("\n");
  return (text.match(TODO_PATTERN) ?? []).length;
}

/** Builds the formal notice for a stored notice record, from the matching sample template. */
export function buildNoticeDocument(state: AppState, notice: Notice): NoticeDocument {
  const rec = state.cases.find((c) => c.id === notice.caseId);
  if (!rec) throw new Error(`Case ${notice.caseId} not found for notice ${notice.id}`);
  const ctx: Ctx = {
    notice,
    rec,
    state,
    asset: state.catalogue.find((a) => a.id === rec.assetId),
    finding: state.findings.find((x) => x.id === rec.findingId),
    evidence: state.evidence.filter((e) => e.caseId === rec.id || rec.evidenceIds.includes(e.id)),
  };
  const f = facts(ctx);
  const templateId = TEMPLATE_FOR_ROUTE[notice.route];
  const body =
    templateId === "dmca" ? dmca(f)
    : templateId === "intermediary" ? intermediary(f)
    : templateId === "escalated" ? escalated(f, ctx)
    : copyrightReporting(f, ctx);
  const doc: Omit<NoticeDocument, "openItems"> = {
    noticeId: notice.id,
    caseId: rec.id,
    route: notice.route,
    status: notice.status,
    templateId,
    templateName: TEMPLATE_LABEL[templateId],
    ...body,
    signature: signature(f),
    references: references(f, notice),
  };
  return { ...doc, openItems: countOpenItems(doc) };
}

/** Plain-text rendering, for "Copy text". */
export function noticeToText(doc: NoticeDocument): string {
  const out: string[] = [`Subject: ${doc.subject}`, "", doc.salutation, "", ...doc.intro.flatMap((p) => [p, ""])];
  doc.sections.forEach((s) => {
    out.push(s.heading);
    (s.paragraphs ?? []).forEach((p) => out.push(p));
    (s.fields ?? []).forEach((x) => out.push(`${x.label}: ${x.value}`));
    (s.bullets ?? []).forEach((b) => out.push(`• ${b}`));
    (s.after ?? []).forEach((p) => out.push(p));
    out.push("");
  });
  doc.closing.forEach((p) => out.push(p, ""));
  doc.references.forEach((r) => out.push(`${r.label}: ${r.value}`));
  out.push("", doc.signOff, "", doc.signature.name, doc.signature.title, `For and on behalf of ${doc.signature.company}`, doc.signature.email, doc.signature.telephone);
  return out.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML rendering, saved as a .doc that Word opens as a formatted letter. */
export function noticeToWordHtml(doc: NoticeDocument): string {
  const p = (t: string) => `<p>${esc(t)}</p>`;
  const sections = doc.sections
    .map((s) => {
      const fields = s.fields?.length
        ? `<table>${s.fields.map((x) => `<tr><td class="l">${esc(x.label)}</td><td>${esc(x.value)}</td></tr>`).join("")}</table>`
        : "";
      const bullets = s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
      return `<h3>${esc(s.heading)}</h3>${(s.paragraphs ?? []).map(p).join("")}${fields}${bullets}${(s.after ?? []).map(p).join("")}`;
    })
    .join("");
  return `<html><head><meta charset="utf-8"><title>${esc(doc.subject)}</title><style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111}
h2{font-size:13pt;margin:0 0 12pt}h3{font-size:11pt;margin:14pt 0 4pt}
table{border-collapse:collapse;margin:4pt 0}td{padding:2pt 10pt 2pt 0;vertical-align:top}td.l{color:#444;white-space:nowrap}
ul{margin:4pt 0 4pt 18pt}
</style></head><body>
<h2>Subject: ${esc(doc.subject)}</h2>
${p(doc.salutation)}${doc.intro.map(p).join("")}${sections}${doc.closing.map(p).join("")}
<table>${doc.references.map((r) => `<tr><td class="l">${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join("")}</table>
${p(doc.signOff)}
<p><b>${esc(doc.signature.name)}</b><br>${esc(doc.signature.title)}<br>For and on behalf of ${esc(doc.signature.company)}<br>${esc(doc.signature.email)}<br>${esc(doc.signature.telephone)}</p>
</body></html>`;
}
