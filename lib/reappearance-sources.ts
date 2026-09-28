/**
 * The monitored sources a reappearance sweep checks, played back by
 * ReappearanceScanPanel while a "Simulate Reappearance" call is in flight.
 * Mirrors the shape of lib/scan-sources.ts (the Discovery scan), but for
 * monitoring's own checkpoints: file hosts, mirrors and cyberlockers rather
 * than discovery platforms. The final source's document is overwritten with
 * the real API result once it resolves, so the "hit" always matches what
 * actually got created.
 */
export interface MonitorCheckpoint {
  id: string;
  platform: string;
  name: string;
  url: string;
}

export const MONITOR_CHECKPOINTS: MonitorCheckpoint[] = [
  { id: "chk-mirror-1", platform: "Independent File Host", name: "files.example-demo.com", url: "https://files.example-demo.com/mirrors/recent" },
  { id: "chk-cyberlocker-1", platform: "Cyberlocker", name: "filedrop-demo.example", url: "https://filedrop-demo.example/f/recent-uploads" },
  { id: "chk-telegram-1", platform: "Telegram", name: "@edu_share_201", url: "https://t.me/edu_share_201/recent" },
  { id: "chk-drive-1", platform: "Google Drive", name: "Shared folders index", url: "https://drive.google.com/drive/shared" },
  { id: "chk-marketplace-1", platform: "Marketplace", name: "market.example-demo.com", url: "https://market.example-demo.com/recent-listings" },
  { id: "chk-social-1", platform: "Social Media", name: "Board Exam Prep 2026 (public group)", url: "https://social-demo.example/groups/board-prep-2026" },
  { id: "chk-mirror-2", platform: "Independent File Host", name: "studyvault-demo.example", url: "https://studyvault-demo.example/uploads/latest" },
];
