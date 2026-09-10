import Link from "next/link";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default function Home() {
  const personas = loadAllPersonas();
  const archetypes = personas.filter((p) => p.source === "archetype");
  const fromProfiles = personas.filter((p) => p.source === "profile");

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="grid gap-10 border-b-2 border-rule py-16 md:grid-cols-[1.4fr_1fr] md:py-20">
        <h1 className="display text-[64px] text-balance text-ink md:text-[96px]">
          Walk in having already had the conversation.
        </h1>
        <div className="flex flex-col justify-end gap-6">
          <p className="max-w-md text-lg leading-relaxed text-ink-2">
            Your phone rings. The person you are about to pitch picks up, pushes back the way they
            will on the day, and decides. Five minutes later you know which line lost them, because
            it is marked.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            It only ever calls you. No contact list, no way to point it at somebody else, and every
            call opens by saying out loud that it is a rehearsal.
          </p>
        </div>
      </section>

      <section className="grid gap-px border-b-2 border-rule bg-rule-soft md:grid-cols-2">
        <div className="bg-paper py-10 pr-8">
          <p className="label text-muted">Two ways in</p>
          <h2 className="display mt-3 text-[40px] text-ink">Pick who calls you</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">
            Three people who are hard in different ways. Each one has a read below: what they will
            do to you, and what they need to hear before they say yes.
          </p>
        </div>
        <Link
          href="/from-profile"
          className="group bg-paper py-10 md:pl-8 transition-colors hover:bg-paper-2"
        >
          <p className="label text-muted">Or</p>
          <h2 className="display mt-3 text-[40px] text-ink">Build one from a profile</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">
            Paste what a real person says about themselves. We read it for how they will push back,
            show you our working, and put them on the line.
          </p>
          <span className="label mt-5 inline-flex items-center gap-2 text-ink">
            Start
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      </section>

      <section>
        {[...fromProfiles, ...archetypes].map((persona) => (
          <Link
            key={persona.id}
            href={`/drill/${persona.id}`}
            className="group grid gap-4 border-b border-rule-soft py-8 transition-colors hover:bg-paper-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-baseline md:gap-8"
          >
            <div>
              {persona.source === "profile" ? (
                <p className="label mb-2 text-muted">Read from a profile</p>
              ) : null}
              <h3 className="display text-[34px] text-ink">{persona.display_name}</h3>
            </div>
            <div>
              <p className="text-[15px] leading-relaxed text-ink-2">{persona.summary}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                They only warm up if{" "}
                {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
              </p>
            </div>
            <span className="label inline-flex items-center gap-2 text-ink">
              Take this call
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
