import Link from "next/link";
import { PersonaCard } from "@/components/persona-card";
import { currentUser } from "@/lib/auth";
import { TRACKS, loadAllPersonas } from "@/lib/persona";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

function Star() {
  return (
    <svg width="14" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.45))" }}>
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

const PROMISES: Array<[string, string, string]> = [
  [
    "You get argued with, not quizzed.",
    "They listen to what you actually said and come back at that, in their own words. There is no script to fall back on and no right answer to guess.",
    "M4 5h16v10H9l-5 4V5Zm3 3v2h10V8H7Zm0 4v2h6v-2H7Z",
  ],
  [
    "You feel it before it costs you anything.",
    "Your own phone rings and you have five minutes with nothing in front of you. These are the same nerves you will have on the day, except this one does not count.",
    "M12 3a7 7 0 0 1 7 7v1h-2v-1a5 5 0 0 0-10 0v1H5v-1a7 7 0 0 1 7-7Zm-6 9h12a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a1 1 0 0 1 1-1Z",
  ],
  [
    "You find out which sentence lost them.",
    "Afterwards every line that worked or hurt is quoted back to you with the time it happened. You go and fix words, instead of a vague feeling that it went badly.",
    "M5 4h14v2H5V4Zm0 5h14v2H5V9Zm0 5h9v2H5v-2Zm0 5h6v2H5v-2Z",
  ],
];

const ORDER: Track[] = ["founders", "sales", "hiring", "real-estate", "everyone"];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const wanted = typeof query.track === "string" && query.track in TRACKS ? (query.track as Track) : null;

  const user = await currentUser();
  const personas = loadAllPersonas(user?.id ?? null);
  const yours = personas.filter((p) => p.source === "profile");
  const regulars = personas.filter((p) => p.source === "archetype");

  const present = ORDER.filter((t) => regulars.some((p) => (p.track ?? "everyone") === t));
  const shown = wanted ? regulars.filter((p) => (p.track ?? "everyone") === wanted) : regulars;

  return (
    <div className="px-5 py-6 md:px-12 md:py-10">
      <header className="max-w-3xl">
        <span className="badge appear appear--pop d-2">
          <Star />
          Have the call once before it counts
        </span>
        <h1 className="h1 appear appear--soft d-3 mt-5 text-[32px] text-balance text-text md:text-[48px]">
          Walk in having already had the <em>conversation</em>.
        </h1>
        <p className="appear appear--soft d-4 mt-4 max-w-[560px] text-[15.5px] leading-[1.55] tracking-[-0.015em] text-muted">
          Your phone rings, and it is the investor, or the buyer who heard your pitch from someone
          else last week, or the hiring manager, or the seller whose listing just died. They push
          back the way they will on the day. Then you find out which of your sentences lost them.
        </p>
      </header>

      <section className="appear appear--soft d-5 mt-8 grid gap-3 md:grid-cols-3">
        {PROMISES.map(([title, body, d]) => (
          <div key={title} className="panel flex gap-4 p-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e8e8e8" aria-hidden className="mt-0.5 shrink-0">
              <path d={d} />
            </svg>
            <div>
              <p className="text-[14px] font-medium tracking-[-0.02em] text-text">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {yours.length > 0 ? (
        <section className="appear appear--soft d-6 mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-medium tracking-[-0.03em] text-text">Your audience</h2>
              <p className="mt-1 text-[14px] text-muted">These are the people you actually have to convince.</p>
            </div>
            <Link href="/from-profile" className="btn btn-ghost">
              Add another
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {yours.map((p) => (
              <PersonaCard key={p.id} persona={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="appear appear--soft d-6 mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-medium tracking-[-0.03em] text-text">Who is calling you?</h2>
            <p className="mt-1 text-[14px] text-muted">
              Pick the conversation you are dreading. Each one is hard in a different way.
            </p>
          </div>
          {yours.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-faint">Soon you will be able to build one from someone&rsquo;s profile.</span>
              <Link href="/from-profile" className="btn btn-ghost">
                Add your own
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className={`pill ${wanted === null ? "pill-on" : ""}`} scroll={false}>
            Everything
          </Link>
          {present.map((t) => (
            <Link key={t} href={`/?track=${t}`} className={`pill ${wanted === t ? "pill-on" : ""}`} scroll={false}>
              {TRACKS[t]!.title}
            </Link>
          ))}
        </div>

        {wanted ? <p className="mt-4 text-[14px] text-muted">{TRACKS[wanted]!.blurb}</p> : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((p) => (
            <PersonaCard key={p.id} persona={p} />
          ))}
        </div>
      </section>

      <p className="appear appear--soft d-7 mt-10 max-w-xl text-[13px] leading-relaxed text-faint">
        It only ever calls you. There is no contact list and no way to point it at somebody else,
        and every call opens by saying out loud that it is a rehearsal.
      </p>
    </div>
  );
}
