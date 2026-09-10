import Link from "next/link";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
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

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="border-b-2 border-rule py-14">
        <p className="label text-muted">Past calls</p>
        <h1 className="display mt-3 text-[56px] text-ink md:text-[80px]">
          {attempts.length === 0 ? "Nothing yet." : "Every call you have taken."}
        </h1>
        {attempts.length === 0 ? (
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Your first rehearsal shows up here.{" "}
            <Link href="/" className="underline underline-offset-4">
              Pick who calls you.
            </Link>
          </p>
        ) : null}
      </section>

      {attempts.length > 0 ? (
        <div className="mt-2">
          <div className="label grid grid-cols-[140px_minmax(0,1fr)_120px_100px] gap-4 border-b-2 border-rule py-3 text-muted">
            <span>When</span>
            <span>Who</span>
            <span className="text-right">Landed</span>
            <span className="text-right">Line</span>
          </div>
          {attempts.map((a) => (
            <Link
              key={a.id}
              href={`/attempt/${encodeURIComponent(a.id)}`}
              className="grid grid-cols-[140px_minmax(0,1fr)_120px_100px] items-baseline gap-4 border-b border-rule-soft py-4 transition-colors hover:bg-paper-2"
            >
              <span className="tnum text-sm text-muted">{when(a.createdAt)}</span>
              <span className="display truncate text-[26px] text-ink">
                {names.get(a.personaId) ?? a.personaId}
              </span>
              <span className="tnum text-right text-[15px] text-ink">
                {a.disposition === "unscored" ? (
                  <span className="text-muted">not graded</span>
                ) : (
                  <>
                    {a.itemsWithEvidence} of {a.itemsTotal}
                    {a.disputed ? <span className="label ml-2 text-no">disputed</span> : null}
                  </>
                )}
              </span>
              <span className="label text-right text-muted">{a.live ? "real" : "recorded"}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
