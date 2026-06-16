import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NBV CRM — Next Bridge Ventures",
  description: "C11 Business Immigration CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
