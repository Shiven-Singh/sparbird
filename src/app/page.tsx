import Link from "next/link";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default function Home() {
  const personas = loadAllPersonas();
  const ordered = [
    ...personas.filter((p) => p.source === "profile"),
    ...personas.filter((p) => p.source === "archetype"),
  ];

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-rule pb-6">
        <div>
          <h1 className="display text-[28px] text-ink">Who is calling you?</h1>
          <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-2">
            Pick the person you are about to face. Your phone rings, they push back the way they
            will on the day, and you get to see where you lost them before it counts.
          </p>
        </div>
        <Link href="/from-profile" className="btn btn-secondary">
          Build one from a profile
        </Link>
      </header>

      <div className="label grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_88px_130px] gap-6 border-b border-rule-soft py-3 text-muted">
        <span>Who</span>
        <span>What they push on</span>
        <span className="text-right">Length</span>
        <span />
      </div>

      {ordered.map((persona) => (
        <Link
          key={persona.id}
          href={`/drill/${persona.id}`}
          className="group grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_88px_130px] items-start gap-6 border-b border-rule-soft py-5 transition-colors hover:bg-paper-2"
        >
          <div className="min-w-0">
            {persona.source === "profile" ? (
              <span className="label mb-1.5 inline-block bg-mark px-1.5 py-0.5 text-ink">From a profile</span>
            ) : null}
            <h2 className="display text-[18px] text-ink">{persona.display_name}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{persona.audience}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] leading-relaxed text-ink-2">{persona.summary}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
            </p>
          </div>
          <span className="tnum pt-0.5 text-right text-[14px] text-ink-2">{persona.max_minutes} min</span>
          <span className="btn justify-center transition-none group-hover:opacity-85">Take this call</span>
        </Link>
      ))}

      <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-muted">
        It only ever calls you. There is no contact list and no way to point it at somebody else,
        and every call opens by saying out loud that it is a rehearsal.
      </p>
    </div>
  );
}
