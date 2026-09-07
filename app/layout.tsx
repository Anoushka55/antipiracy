import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S. Chand Anti-Piracy Command Center",
  description:
    "Enterprise IP protection and enforcement platform prototype for S. Chand & Company",
  icons: { icon: "/schand-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
