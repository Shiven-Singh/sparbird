import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import type { RubricVerdict } from "@/lib/types";

export const dynamic = "force-dynamic";

function outcomeLine(verdict: string | null, landed: number, total: number): string {
  if (verdict === "would_take_meeting") return "They would take the meeting.";
  if (verdict === "would_not") return "They passed.";
  if (landed === 0) return "Nothing you said got through.";
  if (landed === total) return "You got everything you needed out of that call.";
  return "You got partway there.";
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const attempt = store.get(decodeURIComponent(id));
  if (!attempt) notFound();

  const card = attempt.card;
  const landed = card.verdicts.filter((v) => v.met);
  const missed = card.verdicts.filter((v) => !v.met);

  const evidenceByTurn = new Map<number, RubricVerdict>();
  for (const verdict of card.verdicts) {
    if (verdict.span) evidenceByTurn.set(verdict.span.turn, verdict);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-ink-2">
        ← Take another call
      </Link>

      {card.disposition === "unscored" ? (
        <>
          <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-balance text-ink">
            We are not going to grade this one.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">{card.unscoredReason}</p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            A call that drops says nothing about how you did, so it does not count against you.
            Take it again when you are ready.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-balance text-ink">
            {outcomeLine(card.personaVerdict, landed.length, card.itemsTotal)}
          </h1>
          <p className="mt-4 text-lg text-ink-2">
            <span className="text-ink">
              {landed.length} of {card.itemsTotal}
            </span>{" "}
            things landed, and every one of them is quoted below.
          </p>
        </>
      )}

      {card.disputed ? (
        <div className="mt-8 rounded-md border border-dispute/40 bg-raised p-5">
          <h2 className="text-[15px] font-medium text-ink">We went with the recording.</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            The call service summarised this call in a way the recording does not support, so its
            summary was set aside and everything here comes from what was actually said.
          </p>
          <ul className="mt-3 space-y-1.5">
            {card.contradictions.map((c) => (
              <li key={c.field} className="text-sm leading-relaxed text-muted">
                It reported <span className="text-ink-2">{c.field.split(".").pop()}</span> as{" "}
                <span className="text-ink-2">{c.claimed}</span>. {c.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {card.strongestMoment || card.weakestMoment ? (
        <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
          {card.strongestMoment ? (
            <div className="bg-surface p-5">
              <h2 className="text-xs tracking-wide text-muted uppercase">Your best moment</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{card.strongestMoment}</p>
            </div>
          ) : null}
          {card.weakestMoment ? (
            <div className="bg-surface p-5">
              <h2 className="text-xs tracking-wide text-muted uppercase">Where it slipped</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{card.weakestMoment}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {card.verdicts.length > 0 ? (
        <section className="mt-12 space-y-8">
          {landed.length > 0 ? (
            <div>
              <h2 className="text-xs tracking-wide text-muted uppercase">What landed</h2>
              <ul className="mt-4 space-y-4">
                {landed.map((verdict) => (
                  <li key={verdict.id} className="border-l-2 border-landed pl-4">
                    <p className="text-[15px] text-ink">{verdict.description}</p>
                    {verdict.span ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-muted italic">
                        “{verdict.span.quote}”
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {missed.length > 0 ? (
            <div>
              <h2 className="text-xs tracking-wide text-muted uppercase">What did not</h2>
              <ul className="mt-4 space-y-4">
                {missed.map((verdict) => (
                  <li key={verdict.id} className="border-l-2 border-line pl-4">
                    <p className="text-[15px] text-ink-2">{verdict.description}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{verdict.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-14">
        <h2 className="text-xs tracking-wide text-muted uppercase">How the call went</h2>
        <div className="mt-5 space-y-4">
          {attempt.transcript.map((turn, index) => {
            const evidence = evidenceByTurn.get(index);
            const mine = turn.speaker === "user";
            return (
              <div key={index} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] ${mine ? "text-right" : ""}`}>
                  <p className="mb-1 text-xs text-muted">
                    {mine ? "You" : "Them"}
                    {turn.offset_seconds !== null ? ` · ${turn.offset_seconds}s` : ""}
                  </p>
                  <div
                    className={`rounded-md border px-4 py-3 text-[15px] leading-relaxed ${
                      evidence
                        ? "border-landed/40 bg-landed/5 text-ink"
                        : mine
                          ? "border-line bg-raised text-ink"
                          : "border-line-soft bg-surface text-ink-2"
                    }`}
                  >
                    {turn.text}
                  </div>
                  {evidence ? (
                    <p className="mt-1.5 text-xs text-landed">This is where you{" "}
                      {evidence.description.charAt(0).toLowerCase() + evidence.description.slice(1)}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="group mt-12 rounded-md border border-line bg-surface">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm text-ink-2 transition-colors hover:text-ink">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
          How this was scored
        </summary>
        <div className="border-t border-line px-6 py-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <div className="flex justify-between border-b border-line-soft pb-2">
              <dt className="text-sm text-muted">You talked</dt>
              <dd className="text-sm text-ink-2">
                {card.metrics.talkRatioTrainee !== null
                  ? `${Math.round(card.metrics.talkRatioTrainee * 100)}% of the call`
                  : "not measurable"}
              </dd>
            </div>
            <div className="flex justify-between border-b border-line-soft pb-2">
              <dt className="text-sm text-muted">First real number</dt>
              <dd className="text-sm text-ink-2">
                {card.metrics.secondsToFirstNumber === null
                  ? "never came"
                  : `${card.metrics.secondsToFirstNumber}s in`}
              </dd>
            </div>
            <div className="flex justify-between border-b border-line-soft pb-2">
              <dt className="text-sm text-muted">Held your ground</dt>
              <dd className="text-sm text-ink-2">
                {card.metrics.interruptsSurvived} of {card.metrics.interruptsFaced} times
              </dd>
            </div>
            <div className="flex justify-between border-b border-line-soft pb-2">
              <dt className="text-sm text-muted">Points</dt>
              <dd className="text-sm text-ink-2">
                {card.points} of {card.maxPoints}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Nothing counts unless a line of the call proves it, which is why some notes say the
            recording did not show it rather than saying you failed. This one was read by the{" "}
            {card.judge} reader.
          </p>
        </div>
      </details>
    </div>
  );
}
