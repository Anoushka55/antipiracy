/**
 * The sources a discovery scan covers, and the documents it opens on each.
 * The Discovery page plays these back while a scan runs, and runDiscoveryScan
 * reports SCAN_SOURCES.length as "sources scanned". Every URL a mock connector
 * returns (lib/connectors.ts) is listed here as a hit with the same match score;
 * a test keeps the two in step.
 */
export type ScanDocKind = "pdf" | "telegram" | "drive" | "listing" | "archive" | "post";

export interface ScanDoc {
  url: string;
  /** What the document is titled at the source. */
  title: string;
  kind: ScanDocKind;
  /** Present when the document matches a catalogue title. */
  match?: { score: number; watermark: boolean; catalogueTitle: string };
}

export interface ScanSource {
  id: string;
  platform: string;
  name: string;
  docs: ScanDoc[];
}

export const SCAN_SOURCES: ScanSource[] = [
  {
    id: "src-tg-200",
    platform: "Telegram",
    name: "@edu_share_200",
    docs: [{ url: "https://t.me/edu_share_200/4100", title: "NEET_Prep_Full_Series.pdf", kind: "telegram", match: { score: 88, watermark: true, catalogueTitle: "NEET Preparation Series" } }],
  },
  {
    id: "src-tg-201",
    platform: "Telegram",
    name: "@edu_share_201",
    docs: [{ url: "https://t.me/edu_share_201/4101", title: "Class9_Maths_Complete.pdf", kind: "telegram", match: { score: 89, watermark: true, catalogueTitle: "Class 9 Mathematics" } }],
  },
  {
    id: "src-tg-202",
    platform: "Telegram",
    name: "@edu_share_202",
    docs: [{ url: "https://t.me/edu_share_202/4102", title: "Quant_Aptitude_scan.pdf", kind: "telegram", match: { score: 90, watermark: false, catalogueTitle: "Quantitative Aptitude" } }],
  },
  {
    id: "src-web-freepdfs",
    platform: "Website",
    name: "free-pdfs-demo.example",
    docs: [
      { url: "https://free-pdfs-demo.example/cbse/ast-0002-0.pdf", title: "Science Class 10 (Lakhmir Singh).pdf", kind: "pdf", match: { score: 81, watermark: false, catalogueTitle: "Lakhmir Singh Science Class 10" } },
      { url: "https://free-pdfs-demo.example/cbse/ast-0003-1.pdf", title: "English Grammar full book.pdf", kind: "pdf", match: { score: 85, watermark: false, catalogueTitle: "English Grammar & Composition" } },
    ],
  },
  {
    id: "src-mkt-demo",
    platform: "Marketplace",
    name: "market.example-demo.com",
    docs: [{ url: "https://market.example-demo.com/listing/edu-wholesale-3291", title: "Class 9 Maths textbook, PDF, instant delivery", kind: "listing", match: { score: 89, watermark: false, catalogueTitle: "Class 9 Mathematics" } }],
  },
  {
    id: "src-drive-share",
    platform: "Google Drive",
    name: "Shared study folder",
    docs: [{ url: "https://drive.google.com/file/d/demo-scan-lakhmir-10/view", title: "Lakhmir Singh Science 10.pdf", kind: "drive", match: { score: 93, watermark: true, catalogueTitle: "Lakhmir Singh Science Class 10" } }],
  },
  {
    id: "src-web-docshare",
    platform: "Website",
    name: "docshare-demo.example",
    docs: [{ url: "https://docshare-demo.example/d/physics-notes-ch4", title: "Handwritten Physics notes, chapter 4.pdf", kind: "pdf" }],
  },
  {
    id: "src-locker-filedrop",
    platform: "Cyberlocker",
    name: "filedrop-demo.example",
    docs: [{ url: "https://filedrop-demo.example/f/past-papers-2019-2024", title: "Board past papers 2019–2024.zip", kind: "archive" }],
  },
  {
    id: "src-forum-study",
    platform: "Website",
    name: "studyforum-demo.example",
    docs: [{ url: "https://studyforum-demo.example/t/best-books-class-11", title: "Thread: best books for Class 11 Chemistry", kind: "post" }],
  },
  {
    id: "src-mkt-bookbazaar",
    platform: "Marketplace",
    name: "bookbazaar-demo.example",
    docs: [{ url: "https://bookbazaar-demo.example/item/used-physics-12", title: "Used Physics Class 12 (printed copy)", kind: "listing" }],
  },
  {
    id: "src-social-group",
    platform: "Social Media",
    name: "Board Exam Prep 2026 (public group)",
    docs: [{ url: "https://social-demo.example/groups/board-prep-2026/posts/5521", title: "Post: revision timetable for March", kind: "post" }],
  },
  {
    id: "src-tg-ncert",
    platform: "Telegram",
    name: "@ncert_solutions_hub",
    docs: [{ url: "https://t.me/ncert_solutions_hub/812", title: "NCERT_Exemplar_Solutions.pdf", kind: "telegram" }],
  },
];
