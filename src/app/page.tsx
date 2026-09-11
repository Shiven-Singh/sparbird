import Link from "next/link";
import { Tile } from "@/components/tile";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

function Star() {
  return (
    <svg width="14" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.45))" }}>
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

export default function Home() {
  const personas = loadAllPersonas();
  const ordered = [
    ...personas.filter((p) => p.source === "profile"),
    ...personas.filter((p) => p.source === "archetype"),
  ];

  return (
    <div className="px-8 py-10 md:px-12">
      <header className="max-w-3xl">
        <span className="badge appear appear--pop d-2">
          <Star />
          Rehearse the call before it counts
        </span>
        <h1 className="h1 appear appear--soft d-3 mt-5 text-[40px] text-balance text-text md:text-[48px]">
          Walk in having already had the <em>conversation</em>.
        </h1>
        <p className="appear appear--soft d-4 mt-4 max-w-[520px] text-[15.5px] leading-[1.55] tracking-[-0.015em] text-muted">
          Pick the person you are about to face. Your phone rings, they push back the way they will
          on the day, and you see where you lost them, quoted line by line.
        </p>
      </header>

      <section className="panel appear appear--soft d-5 mt-10 rounded-lg">
        <div className="label grid grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_72px_136px] gap-6 border-b border-border-soft px-6 py-3 text-muted">
          <span>Who</span>
          <span>What they push on</span>
          <span className="text-right">Length</span>
          <span />
        </div>

        {ordered.map((persona) => (
          <Link
            key={persona.id}
            href={`/drill/${persona.id}`}
            className="group grid grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_72px_136px] items-start gap-6 border-b border-border-soft px-6 py-5 transition-colors last:border-b-0 hover:bg-panel-2"
          >
            <div className="flex min-w-0 gap-4">
              <Tile name={persona.display_name} mark={persona.source === "profile"} />
              <div className="min-w-0">
                <h2 className="text-[17px] font-medium tracking-[-0.03em] text-text">{persona.display_name}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  {persona.source === "profile" ? "read from a profile" : persona.audience}
                </p>
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[14px] leading-relaxed text-text-2">{persona.summary}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
              </p>
            </div>
            <span className="tnum pt-1 text-right text-[14px] text-text-2">{persona.max_minutes} min</span>
            <span className="btn btn-solid">Take this call</span>
          </Link>
        ))}
      </section>

      <footer className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4 text-[13.5px] tracking-[-0.015em] text-text-2">
        {[
          ["It only ever rings you", "M12 3a7 7 0 0 1 7 7v1h-2v-1a5 5 0 0 0-10 0v1H5v-1a7 7 0 0 1 7-7Zm-6 9h12a1 1 0 0 1 1 1v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a1 1 0 0 1 1-1Z"],
          ["Every point is quoted from the call", "M5 4h14v2H5V4Zm0 5h14v2H5V9Zm0 5h9v2H5v-2Zm0 5h6v2H5v-2Z"],
          ["Every promise you make is flagged", "M6 3h2v18H6V3Zm3 1h9l-2 4 2 4H9V4Z"],
        ].map(([text, d], i) => (
          <span key={text} className={`appear appear--stat d-${6 + i} inline-flex items-center gap-3`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#e8e8e8" aria-hidden>
              <path d={d} />
            </svg>
            {text}
          </span>
        ))}
      </footer>
    </div>
  );
}
