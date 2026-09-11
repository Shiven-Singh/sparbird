import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { PersonaSpec } from "@/lib/types";

export function PersonaCard({ persona }: { persona: PersonaSpec }) {
  return (
    <Link
      href={`/drill/${persona.id}`}
      className="panel group flex h-full flex-col rounded-lg p-4 transition-colors hover:border-border hover:bg-panel-2"
    >
      {/* the stage: a lit figure on a dark ground */}
      <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-md border border-border-soft bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.10),rgba(255,255,255,0)_70%)]">
        <Avatar seed={persona.id} className="h-[152px] w-[152px] translate-y-2" />
        <span className="label absolute top-3 right-3 rounded-sm border border-border bg-bg/70 px-1.5 py-1 text-text backdrop-blur">
          {persona.source === "profile" ? "Yours" : `${persona.max_minutes} min`}
        </span>
      </div>

      <div className="flex-1">
        <h2 className="mt-4 truncate text-[17px] font-medium tracking-[-0.03em] text-text">{persona.display_name}</h2>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {persona.source === "profile" ? "read from what they say in public" : persona.audience}
        </p>
        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-text-2">{persona.summary}</p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
          Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
        </p>
      </div>

      <span className="btn btn-solid mt-5 w-full">Take this call</span>
    </Link>
  );
}
