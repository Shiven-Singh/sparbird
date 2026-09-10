import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sparbird",
  description: "Rehearse the call before the real one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
