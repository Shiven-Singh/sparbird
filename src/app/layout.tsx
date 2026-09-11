import type { Metadata } from "next";
import { DM_Serif_Display, Hanken_Grotesk, Poppins } from "next/font/google";
import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { isLive } from "@/lib/calle";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";
import { ensureSeeded } from "@/lib/seed";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dmserif",
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

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded();
  const live = isLive();
  const store = await getStore();
  const recent = store.list().slice(0, 10);

  const names = new Map<string, string>();
  for (const a of recent) {
    if (names.has(a.personaId)) continue;
    try {
      names.set(a.personaId, loadPersona(a.personaId).display_name);
    } catch {
      names.set(a.personaId, a.personaId);
    }
  }

  return (
    <html lang="en" className={`${poppins.variable} ${dmSerif.variable} ${hanken.variable}`}>
      <body className="min-h-screen">
        <div className="grid min-h-screen md:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="flex flex-col bg-rail text-rail-ink md:sticky md:top-0 md:h-screen">
            <div className="px-5 pt-5 pb-5">
              <Link href="/" className="text-rail-ink">
                <Wordmark onDark />
              </Link>
            </div>

            <nav className="flex flex-col gap-2 px-5">
              <Link href="/" className="btn btn-primary justify-between">
                New rehearsal <span aria-hidden>→</span>
              </Link>
              <Link href="/from-profile" className="btn btn-rail justify-between">
                From a profile <span aria-hidden>→</span>
              </Link>
            </nav>

            <div className="mt-8 flex min-h-0 flex-1 flex-col px-5">
              <div className="flex items-baseline justify-between">
                <p className="label text-rail-muted">Past calls</p>
                <Link href="/calls" className="label text-rail-muted hover:text-rail-ink">
                  All
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="mt-3 text-[13px] leading-relaxed text-rail-muted">
                  Your first rehearsal shows up here.
                </p>
              ) : (
                <ul className="mt-2 -mx-2 overflow-y-auto">
                  {recent.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/attempt/${encodeURIComponent(a.id)}`}
                        className="flex items-start gap-2.5 px-2 py-2 transition-colors hover:bg-rail-2"
                      >
                        <span
                          aria-hidden
                          className={`mt-1.5 size-2 shrink-0 ${
                            a.disposition === "unscored"
                              ? "ring-1 ring-rail-muted"
                              : a.disputed
                                ? "bg-no"
                                : a.itemsWithEvidence === a.itemsTotal
                                  ? "bg-mark"
                                  : "bg-rail-ink"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-rail-ink">
                            {names.get(a.personaId) ?? a.personaId}
                          </span>
                          <span className="tnum block text-[12px] text-rail-muted">
                            {a.disposition === "unscored"
                              ? "not graded"
                              : `${a.itemsWithEvidence} of ${a.itemsTotal} landed`}
                            {a.disputed ? " · disputed" : ""}
                          </span>
                        </span>
                        <span className="tnum text-[12px] text-rail-muted">{ago(a.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-rail-rule px-5 py-4">
              <p className="flex items-center gap-2 text-[12px] text-rail-muted">
                <span aria-hidden className={`size-2 ${live ? "bg-mark" : "ring-1 ring-rail-muted"}`} />
                {live ? "Your phone can ring" : "Nothing will ring"}
              </p>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
