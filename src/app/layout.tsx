import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import Link from "next/link";
import { getStore } from "@/lib/db";
import { isLive } from "@/lib/calle";
import { loadPersona } from "@/lib/persona";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  title: "Sparbird",
  description: "Walk in having already had the conversation.",
};

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  const past = store.list().slice(0, 12);
  const live = isLive();

  // A persona built from a profile can be deleted after the call it was made for.
  const names = new Map<string, string>();
  for (const attempt of past) {
    if (names.has(attempt.personaId)) continue;
    try {
      names.set(attempt.personaId, loadPersona(attempt.personaId).display_name);
    } catch {
      names.set(attempt.personaId, attempt.personaId.replace(/-/g, " "));
    }
  }

  return (
    <html lang="en" className={`${newsreader.variable} ${hanken.variable}`}>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
            <div className="border-b border-line px-6 py-5">
              <Link href="/" className="font-display text-xl tracking-tight text-ink">
                Sparbird
              </Link>
              <p className="mt-1 text-xs text-muted">Practice on the toughest version of them</p>
            </div>

            <div className="px-6 py-4">
              <Link
                href="/"
                className="block rounded-sm border border-line bg-raised px-3 py-2 text-center text-sm text-ink transition-colors hover:border-brass-dim"
              >
                New rehearsal
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <h2 className="px-3 pb-2 text-xs tracking-wide text-muted uppercase">Your calls</h2>
              {past.length === 0 ? (
                <p className="px-3 text-sm leading-relaxed text-muted">
                  Nothing yet. Your first rehearsal shows up here.
                </p>
              ) : (
                <ul className="space-y-1">
                  {past.map((attempt) => (
                    <li key={attempt.id}>
                      <Link
                        href={`/attempt/${encodeURIComponent(attempt.id)}`}
                        className="flex items-start gap-2 rounded-sm px-3 py-2 transition-colors hover:bg-raised"
                      >
                        <span
                          aria-hidden
                          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                            attempt.disposition === "unscored"
                              ? "bg-muted"
                              : attempt.disputed
                                ? "bg-dispute"
                                : attempt.points >= attempt.maxPoints * 0.6
                                  ? "bg-landed"
                                  : "bg-brass"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-ink-2">
                            {names.get(attempt.personaId) ?? attempt.personaId}
                          </span>
                          <span className="block text-xs text-muted">
                            {attempt.disposition === "unscored"
                              ? "not graded"
                              : `${attempt.itemsWithEvidence} of ${attempt.itemsTotal} landed`}{" "}
                            · {timeAgo(attempt.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line px-6 py-4">
              <p className="flex items-center gap-2 text-xs text-muted">
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${live ? "bg-dispute" : "bg-landed"}`}
                />
                {live ? "Your phone can ring" : "Nothing will ring"}
              </p>
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
