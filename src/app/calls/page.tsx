import Link from "next/link";
import { Tile } from "@/components/tile";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CallsPage() {
  const store = await getStore();
  const attempts = store.list();

  const names = new Map<string, string>();
  for (const a of attempts) {
    if (names.has(a.personaId)) continue;
    try {
      names.set(a.personaId, loadPersona(a.personaId).display_name);
    } catch {
      names.set(a.personaId, a.personaId);
    }
  }

  const cols = "grid-cols-[130px_minmax(0,1fr)_120px_90px_90px_90px]";

  return (
    <div className="px-8 py-10 md:px-12">
      <header className="appear appear--soft d-1 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="h1 text-[36px] text-text">
            Every call you have <em>taken</em>.
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            {attempts.length === 0
              ? "Nothing yet. Your first rehearsal shows up here."
              : `${attempts.length} call${attempts.length === 1 ? "" : "s"}, most recent first.`}
          </p>
        </div>
        <Link href="/" className="btn btn-solid">
          New rehearsal
        </Link>
      </header>

      {attempts.length > 0 ? (
        <section className="panel appear appear--soft d-2 mt-8 rounded-lg">
          <div className={`label grid ${cols} gap-4 border-b border-border-soft px-6 py-3 text-muted`}>
            <span>When</span>
            <span>Who</span>
            <span className="text-right">Landed</span>
            <span className="text-right">Points</span>
            <span className="text-right">Flags</span>
            <span className="text-right">Line</span>
          </div>
          {attempts.map((a) => (
            <Link
              key={a.id}
              href={`/attempt/${encodeURIComponent(a.id)}`}
              className={`grid ${cols} items-center gap-4 border-b border-border-soft px-6 py-3 transition-colors last:border-b-0 hover:bg-panel-2`}
            >
              <span className="tnum text-[13px] text-muted">{when(a.createdAt)}</span>
              <span className="flex min-w-0 items-center gap-3">
                <Tile name={names.get(a.personaId) ?? a.personaId} className="!size-8 !text-[12px]" />
                <span className="truncate text-[15px] font-medium tracking-[-0.02em] text-text">{names.get(a.personaId) ?? a.personaId}</span>
              </span>
              <span className="tnum text-right text-[14px] text-text">
                {a.disposition === "unscored" ? (
                  <span className="text-muted">not graded</span>
                ) : (
                  <>
                    {a.itemsWithEvidence} of {a.itemsTotal}
                    {a.disputed ? <span className="label ml-2 text-muted">disputed</span> : null}
                  </>
                )}
              </span>
              <span className="tnum text-right text-[14px] text-text-2">
                {a.disposition === "unscored" ? "" : `${a.points} / ${a.maxPoints}`}
              </span>
              <span className="tnum text-right text-[14px] text-text-2">
                {a.card.review ? (a.card.review.flags.length === 0 ? <span className="text-muted">none</span> : a.card.review.flags.length) : ""}
              </span>
              <span className="label text-right text-muted">{a.live ? "real" : "recorded"}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
