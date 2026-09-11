import Link from "next/link";
import { Avatar } from "@/components/avatar";
import type { PersonaSpec } from "@/lib/types";

export function PersonaCard({ persona }: { persona: PersonaSpec }) {
  return (
    <Link
      href={`/drill/${persona.id}`}
      className="panel group flex flex-col rounded-lg p-5 transition-colors hover:border-border hover:bg-panel-2"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-16 place-items-center rounded-lg border border-border-soft bg-panel">
          <Avatar seed={persona.id} className="size-14" />
        </span>
        {persona.source === "profile" ? (
          <span className="label rounded-sm border border-border px-1.5 py-1 text-text">Yours</span>
        ) : (
          <span className="tnum text-[12px] text-muted">{persona.max_minutes} min</span>
        )}
      </div>

      <h2 className="mt-4 text-[17px] font-medium tracking-[-0.03em] text-text">{persona.display_name}</h2>
      <p className="mt-0.5 text-[13px] text-muted">
        {persona.source === "profile" ? "read from what they say in public" : persona.audience}
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-text-2">{persona.summary}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
      </p>

      <span className="btn btn-solid mt-5 w-full">Take this call</span>
    </Link>
  );
}
