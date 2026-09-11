import Link from "next/link";
import { Tile } from "@/components/tile";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default function Home() {
  const personas = loadAllPersonas();
  const ordered = [
    ...personas.filter((p) => p.source === "profile"),
    ...personas.filter((p) => p.source === "archetype"),
  ];

  return (
    <div className="px-8 py-8 md:px-10">
      <header className="rise flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-[34px] text-ink">Who is calling you?</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">
            Pick the person you are about to face. Your phone rings, they push back the way they
            will on the day, and you see where you lost them before it counts.
          </p>
        </div>
        <Link href="/from-profile" className="btn btn-secondary">
          Build one from a profile
        </Link>
      </header>

      <section className="sheet rise rise-2 mt-8">
        <div className="label grid grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_72px_136px] gap-6 border-b border-rule-soft px-6 py-3 text-muted">
          <span>Who</span>
          <span>What they push on</span>
          <span className="text-right">Length</span>
          <span />
        </div>

        {ordered.map((persona) => (
          <Link
            key={persona.id}
            href={`/drill/${persona.id}`}
            className="group grid grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_72px_136px] items-start gap-6 border-b border-rule-soft px-6 py-5 transition-colors last:border-b-0 hover:bg-paper"
          >
            <div className="flex min-w-0 gap-4">
              <Tile name={persona.display_name} mark={persona.source === "profile"} />
              <div className="min-w-0">
                <h2 className="display text-[21px] leading-tight text-ink">{persona.display_name}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  {persona.source === "profile" ? "read from a profile" : persona.audience}
                </p>
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] leading-relaxed text-ink-2">{persona.summary}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
              </p>
            </div>
            <span className="tnum pt-1 text-right text-[14px] text-ink-2">{persona.max_minutes} min</span>
            <span className="btn btn-primary transition-none">Take this call</span>
          </Link>
        ))}
      </section>

      <p className="rise rise-3 mt-5 max-w-xl text-[13px] leading-relaxed text-muted">
        It only ever calls you. There is no contact list and no way to point it at somebody else,
        and every call opens by saying out loud that it is a rehearsal.
      </p>
    </div>
  );
}
