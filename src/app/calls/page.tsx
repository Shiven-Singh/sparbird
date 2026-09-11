import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { currentUser } from "@/lib/auth";
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
  const user = await currentUser();
  const store = await getStore();
  const attempts = store.list({ viewer: user?.id ?? null });

  const names = new Map<string, string>();
  for (const a of attempts) {
    if (names.has(a.personaId)) continue;
    try {
      names.set(a.personaId, loadPersona(a.personaId).display_name);
    } catch {
      names.set(a.personaId, a.personaId);
    }
  }

  const cols = "grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[130px_minmax(0,1fr)_110px_80px_70px_80px]";

  return (
    <div className="px-5 py-6 md:px-12 md:py-10">
      <header className="appear appear--soft d-1 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="h1 text-[30px] text-text md:text-[36px]">
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
          <div className={`label grid ${cols} gap-4 border-b border-border-soft px-4 py-3 text-muted sm:px-6`}>
            <span className="hidden sm:block">When</span>
            <span>Who</span>
            <span className="text-right">Landed</span>
            <span className="hidden text-right sm:block">Points</span>
            <span className="hidden text-right sm:block">Flags</span>
            <span className="hidden text-right sm:block">Line</span>
          </div>
          {attempts.map((a) => (
            <Link
              key={a.id}
              href={`/attempt/${encodeURIComponent(a.id)}`}
              className={`grid ${cols} items-center gap-4 border-b border-border-soft px-4 py-3 transition-colors last:border-b-0 hover:bg-panel-2 sm:px-6`}
            >
              <span className="tnum hidden text-[13px] text-muted sm:block">{when(a.createdAt)}</span>
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border-soft bg-panel">
                  <Avatar seed={a.personaId} className="size-8" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium tracking-[-0.02em] text-text">{names.get(a.personaId) ?? a.personaId}</span>
                  <span className="tnum block text-[12px] text-muted sm:hidden">{when(a.createdAt)}</span>
                </span>
              </span>
              <span className="tnum flex items-center justify-end gap-2 text-right text-[14px] text-text">
                {a.disposition === "unscored" ? (
                  <span className="text-muted">not graded</span>
                ) : (
                  <>
                    <span
                      aria-hidden
                      className={`dot ${
                        a.itemsWithEvidence === a.itemsTotal
                          ? "dot-good"
                          : a.itemsWithEvidence === 0
                            ? "dot-bad"
                            : "dot-none"
                      }`}
                    />
                    {a.itemsWithEvidence} of {a.itemsTotal}
                    {a.disputed ? <span className="label ml-1 hidden text-warn sm:inline">disputed</span> : null}
                  </>
                )}
              </span>
              <span className="tnum hidden text-right text-[14px] text-text-2 sm:block">
                {a.disposition === "unscored" ? "" : `${a.points} / ${a.maxPoints}`}
              </span>
              <span className="tnum hidden text-right text-[14px] sm:block">
                {a.card.review ? (
                  a.card.review.flags.length === 0 ? (
                    <span className="text-muted">none</span>
                  ) : (
                    <span className="text-warn">{a.card.review.flags.length}</span>
                  )
                ) : (
                  ""
                )}
              </span>
              <span className="label hidden text-right text-muted sm:block">{a.live ? "real" : "recorded"}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
