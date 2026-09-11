import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import Link from "next/link";
import { Mark, Wordmark } from "@/components/logo";
import { SignOut } from "@/components/sign-out";
import { currentUser } from "@/lib/auth";
import { isLive } from "@/lib/calle";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";
import { ensureSeeded } from "@/lib/seed";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sparbird",
  description: "Walk in having already had the conversation.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
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
  const user = await currentUser();
  const store = await getStore();
  const recent = store.list({ viewer: user?.id ?? null }).slice(0, 10);

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
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body style={{ background: "#000", color: "#fff" }} className="min-h-screen">
        <div className="grain" aria-hidden />
        <div className="md:grid md:min-h-screen md:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="panel md:sticky md:top-0 md:flex md:h-screen md:flex-col">
            {/* phone: one bar */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
              <Link href="/" className="inline-block" aria-label="Sparbird">
                <Mark className="size-7" />
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/pricing" className="pill h-9 px-3">
                  Pricing
                </Link>
                {user ? (
                  <Link href="/calls" className="pill h-9 px-3">
                    Calls
                  </Link>
                ) : (
                  <Link href="/signin" className="pill h-9 px-3">
                    Sign in
                  </Link>
                )}
                <Link href="/" className="btn btn-solid h-9 px-3">
                  New
                </Link>
              </div>
            </div>

            {/* desktop: the rail */}
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
              <div className="appear appear--scale d-1 px-5 pt-6 pb-5">
                <Link href="/" className="inline-block">
                  <Wordmark />
                </Link>
              </div>

              <nav className="flex flex-col gap-2 px-5">
                <Link href="/" className="btn btn-solid appear appear--soft d-2 justify-between">
                  New rehearsal <span aria-hidden>→</span>
                </Link>
                <Link href="/from-profile" className="btn btn-ghost appear appear--soft d-3 justify-between">
                  Your audience <span aria-hidden>→</span>
                </Link>
              </nav>

              <div className="appear appear--soft d-4 mt-8 flex min-h-0 flex-1 flex-col px-5">
                <div className="flex items-baseline justify-between">
                  <p className="label text-muted">Past calls</p>
                  <Link href="/calls" className="label text-muted transition-colors hover:text-text">
                    All
                  </Link>
                </div>
                {recent.length === 0 ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-muted">Your first rehearsal shows up here.</p>
                ) : (
                  <ul className="mt-2 -mx-2 overflow-y-auto">
                    {recent.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/attempt/${encodeURIComponent(a.id)}`}
                          className="flex items-start gap-2.5 px-2 py-2 transition-colors hover:bg-panel-2"
                        >
                          <span
                            aria-hidden
                            className={`dot mt-1.5 ${
                              a.disposition === "unscored"
                                ? "dot-none"
                                : a.itemsWithEvidence === a.itemsTotal
                                  ? "dot-good"
                                  : a.itemsWithEvidence === 0
                                    ? "dot-bad"
                                    : "dot-none"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-text">
                              {names.get(a.personaId) ?? a.personaId}
                            </span>
                            <span className="tnum block text-[12px] text-muted">
                              {a.disposition === "unscored"
                                ? "not graded"
                                : `${a.itemsWithEvidence} of ${a.itemsTotal} landed`}
                              {a.card.review && a.card.review.flags.length > 0 ? (
                                <span className="text-warn">
                                  {" · "}
                                  {a.card.review.flags.length} to watch
                                </span>
                              ) : null}
                              {a.disputed ? " · disputed" : ""}
                            </span>
                          </span>
                          <span className="tnum text-[12px] text-faint">{ago(a.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="panel-head px-5 py-4">
                <p className="mb-3 flex items-center gap-2 text-[12px] text-muted">
                  <span aria-hidden className={`dot ${live ? "dot-good" : "dot-none"}`} />
                  {live ? "Your phone can ring" : "Nothing will ring"}
                </p>
                {user ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[13px] text-text-2">{user.name}</span>
                    <SignOut className="label text-muted transition-colors hover:text-text" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/signin" className="label text-muted transition-colors hover:text-text">
                      Sign in
                    </Link>
                    <Link href="/pricing" className="label text-text">
                      Pricing
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
