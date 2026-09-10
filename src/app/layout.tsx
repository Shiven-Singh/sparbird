import type { Metadata } from "next";
import { Anton, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { isLive } from "@/lib/calle";
import { ensureSeeded } from "@/lib/seed";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sparbird",
  description: "Walk in having already had the conversation.",
};

const NAV = [
  { href: "/", label: "Rehearse" },
  { href: "/from-profile", label: "From a profile" },
  { href: "/calls", label: "Past calls" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded();
  const live = isLive();

  return (
    <html lang="en" className={`${anton.variable} ${hanken.variable}`}>
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b-2 border-rule bg-paper">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link href="/" className="display text-[22px] leading-none tracking-wide text-ink">
              Sparbird
            </Link>
            <nav className="flex items-center gap-7">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="label text-ink transition-colors hover:text-muted"
                >
                  {item.label}
                </Link>
              ))}
              <span
                className={`label px-2.5 py-1.5 ${
                  live ? "bg-mark text-ink" : "border border-rule-soft text-muted"
                }`}
              >
                {live ? "Your phone can ring" : "Nothing will ring"}
              </span>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
