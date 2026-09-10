import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";
import type { RubricVerdict } from "@/lib/types";

export const dynamic = "force-dynamic";

function timecode(seconds: number | null): string {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function outcomeLine(verdict: string | null, landed: number, total: number): string {
  if (verdict === "would_take_meeting") return "They would take the meeting.";
  if (verdict === "would_not") return "They passed.";
  if (landed === 0) return "Nothing you said got through.";
  if (landed === total) return "You got everything you needed.";
  return "You got partway there.";
}

/** The line, with the words that earned the point under a highlighter. */
function Marked({ text, quote }: { text: string; quote: string | null }) {
  if (!quote) return <>{text}</>;
  const at = text.indexOf(quote);
  if (at === -1) return <mark>{text}</mark>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const attempt = store.get(decodeURIComponent(id));
  if (!attempt) notFound();

  const card = attempt.card;
  const landed = card.verdicts.filter((v) => v.met);
  const unscored = card.disposition === "unscored";

  let who = attempt.personaId;
  try {
    who = loadPersona(attempt.personaId).display_name;
  } catch {
    // A persona built from a profile may have been removed since.
  }

  const evidenceByTurn = new Map<number, RubricVerdict>();
  for (const verdict of card.verdicts) {
    if (verdict.span) evidenceByTurn.set(verdict.span.turn, verdict);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="grid gap-8 border-b-2 border-rule py-14 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="label text-muted">
            {who} · {attempt.live ? "a real call" : "a recorded call"}
          </p>
          <h1 className="display mt-4 max-w-4xl text-[56px] text-balance text-ink md:text-[80px]">
            {unscored ? "We are not grading this one." : outcomeLine(card.personaVerdict, landed.length, card.itemsTotal)}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            {unscored
              ? card.unscoredReason
              : landed.length < card.itemsTotal && card.weakestMoment
                ? `Where it slipped: ${card.weakestMoment.charAt(0).toLowerCase()}${card.weakestMoment.slice(1)}`
                : card.strongestMoment
                  ? `What did it: ${card.strongestMoment.charAt(0).toLowerCase()}${card.strongestMoment.slice(1)}`
                  : ""}
          </p>
        </div>
        {!unscored ? (
          <div className="md:text-right">
            <p className="display tnum text-[96px] leading-none text-ink md:text-[128px]">
              {landed.length}
              <span className="text-muted">/{card.itemsTotal}</span>
            </p>
            <p className="label text-muted">Things they needed to hear</p>
          </div>
        ) : null}
      </section>

      {card.disputed ? (
        <section className="border-b border-rule-soft py-8">
          <p className="label text-no">We went with the recording</p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            The call service summarised this call in a way the recording does not support, so its
            summary was ignored. Everything on this page comes from what was actually said.
          </p>
        </section>
      ) : null}

      <section className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="label text-muted">The call</p>
          <div className="mt-6 border-t-2 border-rule">
            {attempt.transcript.map((turn, index) => {
              const evidence = evidenceByTurn.get(index);
              const mine = turn.speaker === "user";
              return (
                <div
                  key={index}
                  id={`turn-${index}`}
                  className="grid scroll-mt-20 grid-cols-[52px_56px_minmax(0,1fr)] gap-x-4 border-b border-rule-soft py-4"
                >
                  <span className="label tnum pt-1 text-muted">{timecode(turn.offset_seconds)}</span>
                  <span className={`label pt-1 ${mine ? "text-ink" : "text-muted"}`}>
                    {mine ? "You" : "Them"}
                  </span>
                  <div>
                    <p className={`text-[16px] leading-relaxed ${mine ? "text-ink" : "text-ink-2"}`}>
                      <Marked text={turn.text} quote={evidence?.span?.quote ?? null} />
                    </p>
                    {evidence ? (
                      <p className="label mt-2 text-ink">↳ {evidence.description}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {card.verdicts.length > 0 ? (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="label text-muted">What they needed to hear</p>
            <ul className="mt-6 divide-y divide-rule-soft border-t-2 border-rule">
              {card.verdicts.map((verdict) => (
                <li key={verdict.id} className="flex gap-4 py-4">
                  <span
                    aria-hidden
                    className={`mt-1 size-3 shrink-0 ${verdict.met ? "bg-mark ring-1 ring-ink" : "ring-1 ring-muted"}`}
                  />
                  <div className="min-w-0">
                    <p className={`text-[15px] leading-snug ${verdict.met ? "text-ink" : "text-muted"}`}>
                      {verdict.description}
                    </p>
                    {verdict.span ? (
                      <a
                        href={`#turn-${verdict.span.turn}`}
                        className="label tnum mt-1.5 inline-block text-muted hover:text-ink"
                      >
                        At {timecode(attempt.transcript[verdict.span.turn]?.offset_seconds ?? null)} →
                      </a>
                    ) : (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{verdict.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-8 divide-y divide-rule-soft border-t border-rule-soft">
              {[
                [
                  "You talked",
                  card.metrics.talkRatioTrainee !== null
                    ? `${Math.round(card.metrics.talkRatioTrainee * 100)}% of the call`
                    : "not measurable",
                ],
                [
                  "First real number",
                  card.metrics.secondsToFirstNumber === null
                    ? "never came"
                    : `${timecode(card.metrics.secondsToFirstNumber)} in`,
                ],
                ["Held your ground", `${card.metrics.interruptsSurvived} of ${card.metrics.interruptsFaced} times`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd className="tnum text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs leading-relaxed text-muted">
              Nothing counts unless a line of the call proves it, which is why some of these say the
              call did not show it rather than saying you failed.
            </p>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
