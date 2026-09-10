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

  const evidenceByTurn = new Map<number, RubricVerdict>();
  for (const verdict of card.verdicts) {
    if (verdict.span) evidenceByTurn.set(verdict.span.turn, verdict);
  }

  const unscored = card.disposition === "unscored";

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 md:px-10">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-ink-2">
        ← Take another call
      </Link>

      <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-balance text-ink">
        {unscored
          ? "We are not going to grade this one."
          : outcomeLine(card.personaVerdict, landed.length, card.itemsTotal)}
      </h1>

      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-2">
        {unscored ? (
          card.unscoredReason
        ) : (
          <>
            You got <span className="text-ink">{landed.length}</span> of the{" "}
            <span className="text-ink">{card.itemsTotal}</span> things this person needed to hear.
            {landed.length < card.itemsTotal && card.weakestMoment
              ? ` Where it slipped: ${card.weakestMoment.charAt(0).toLowerCase()}${card.weakestMoment.slice(1)}`
              : ""}
          </>
        )}
      </p>

      {card.disputed ? (
        <div className="mt-8 rounded-md bg-raised p-5 ring-1 ring-dispute/30">
          <h2 className="text-[15px] font-medium text-ink">We went with the recording.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
            The call service summarised this call in a way the recording does not support, so we
            ignored its summary. Everything on this page comes from what was actually said.
          </p>
        </div>
      ) : null}

      <div className="mt-12 gap-12 lg:flex lg:items-start">
        <section className="min-w-0 flex-1">
          <h2 className="text-xs tracking-wide text-muted uppercase">The call</h2>
          <div className="mt-5 space-y-5">
            {attempt.transcript.map((turn, index) => {
              const evidence = evidenceByTurn.get(index);
              const mine = turn.speaker === "user";
              return (
                <div
                  key={index}
                  id={`turn-${index}`}
                  className={`scroll-mt-8 ${mine ? "flex justify-end" : "flex justify-start"}`}
                >
                  <div className={`max-w-[88%] ${mine ? "text-right" : ""}`}>
                    <p className="mb-1.5 text-xs text-muted">
                      {mine ? "You" : "Them"}
                      {turn.offset_seconds !== null ? ` · ${turn.offset_seconds}s` : ""}
                    </p>
                    <div
                      className={`rounded-md px-4 py-3 text-[15px] leading-relaxed ${
                        evidence
                          ? "bg-landed/10 text-ink ring-1 ring-landed/30"
                          : mine
                            ? "bg-raised text-ink"
                            : "bg-surface text-ink-2"
                      }`}
                    >
                      {turn.text}
                    </div>
                    {evidence ? (
                      <p className="mt-1.5 text-xs text-landed">
                        ✓ {evidence.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {card.verdicts.length > 0 ? (
          <aside className="mt-12 w-full shrink-0 lg:sticky lg:top-8 lg:mt-0 lg:w-72">
            <h2 className="text-xs tracking-wide text-muted uppercase">What they needed to hear</h2>
            <ul className="mt-5 space-y-4">
              {card.verdicts.map((verdict) => (
                <li key={verdict.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      verdict.met ? "bg-landed" : "ring-1 ring-muted"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm ${verdict.met ? "text-ink" : "text-ink-2"}`}>
                      {verdict.description}
                    </p>
                    {verdict.span ? (
                      <a
                        href={`#turn-${verdict.span.turn}`}
                        className="mt-0.5 inline-block text-xs text-muted transition-colors hover:text-brass"
                      >
                        Hear it back →
                      </a>
                    ) : (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{verdict.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-8 space-y-2.5 border-t border-line pt-5">
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted">You talked</dt>
                <dd className="text-xs text-ink-2">
                  {card.metrics.talkRatioTrainee !== null
                    ? `${Math.round(card.metrics.talkRatioTrainee * 100)}% of the call`
                    : "not measurable"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted">First real number</dt>
                <dd className="text-xs text-ink-2">
                  {card.metrics.secondsToFirstNumber === null
                    ? "never came"
                    : `${card.metrics.secondsToFirstNumber}s in`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs text-muted">Held your ground</dt>
                <dd className="text-xs text-ink-2">
                  {card.metrics.interruptsSurvived} of {card.metrics.interruptsFaced} times
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-muted">
              Nothing counts unless a line of the call proves it, which is why some of these say the
              call did not show it rather than saying you failed.
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
