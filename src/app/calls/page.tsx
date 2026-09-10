import Link from "next/link";
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

  const cols = "grid-cols-[130px_minmax(0,1fr)_110px_100px_90px]";

  return (
    <div className="px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-rule pb-6">
        <div>
          <h1 className="display text-[28px] text-ink">Past calls</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {attempts.length === 0
              ? "Nothing yet. Your first rehearsal shows up here."
              : `${attempts.length} call${attempts.length === 1 ? "" : "s"}, most recent first.`}
          </p>
        </div>
        <Link href="/" className="btn">
          New rehearsal
        </Link>
      </header>

      {attempts.length > 0 ? (
        <>
          <div className={`label grid ${cols} gap-4 border-b border-rule-soft py-3 text-muted`}>
            <span>When</span>
            <span>Who</span>
            <span className="text-right">Landed</span>
            <span className="text-right">Points</span>
            <span className="text-right">Line</span>
          </div>
          {attempts.map((a) => (
            <Link
              key={a.id}
              href={`/attempt/${encodeURIComponent(a.id)}`}
              className={`grid ${cols} items-baseline gap-4 border-b border-rule-soft py-3.5 transition-colors hover:bg-paper-2`}
            >
              <span className="tnum text-[13px] text-muted">{when(a.createdAt)}</span>
              <span className="display truncate text-[16px] text-ink">{names.get(a.personaId) ?? a.personaId}</span>
              <span className="tnum text-right text-[14px] text-ink">
                {a.disposition === "unscored" ? (
                  <span className="text-muted">not graded</span>
                ) : (
                  <>
                    {a.itemsWithEvidence} of {a.itemsTotal}
                    {a.disputed ? <span className="label ml-2 text-no">disputed</span> : null}
                  </>
                )}
              </span>
              <span className="tnum text-right text-[14px] text-ink-2">
                {a.disposition === "unscored" ? "" : `${a.points} / ${a.maxPoints}`}
              </span>
              <span className="label text-right text-muted">{a.live ? "real" : "recorded"}</span>
            </Link>
          ))}
        </>
      ) : null}
    </div>
  );
}
