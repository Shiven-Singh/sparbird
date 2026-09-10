import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";
import type { RubricVerdict } from "@/lib/types";

export const dynamic = "force-dynamic";

function timecode(seconds: number | null): string {
  if (seconds === null) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function outcomeLine(verdict: string | null, landed: number, total: number): string {
  if (verdict === "would_take_meeting") return "They would take the meeting.";
  if (verdict === "would_not") return "They passed.";
  if (landed === 0) return "Nothing you said got through.";
  if (landed === total) return "You got everything you needed.";
  return "You got partway there.";
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
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

  const subtitle = unscored
    ? card.unscoredReason
    : landed.length < card.itemsTotal && card.weakestMoment
      ? `Where it slipped: ${lower(card.weakestMoment)}`
      : card.strongestMoment
        ? `What did it: ${lower(card.strongestMoment)}`
        : "";

  return (
    <div className="px-8 py-8">
      <div className="flex items-center gap-3">
        <Link href={`/drill/${attempt.personaId}`} className="label text-muted hover:text-ink">
          ← {who}
        </Link>
        <span className="label text-muted">· {attempt.live ? "a real call" : "a recorded call"}</span>
      </div>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6 border-b-2 border-rule pb-6">
        <div className="max-w-2xl">
          <h1 className="display text-[28px] text-ink">
            {unscored ? "We are not grading this one." : outcomeLine(card.personaVerdict, landed.length, card.itemsTotal)}
          </h1>
          {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p> : null}
        </div>
        {!unscored ? (
          <div className="flex items-baseline gap-2">
            <span className="display tnum text-[44px] leading-none text-ink">{landed.length}</span>
            <span className="display tnum text-[22px] leading-none text-muted">/ {card.itemsTotal}</span>
            <span className="label ml-2 text-muted">landed</span>
          </div>
        ) : null}
      </header>

      {card.disputed ? (
        <div className="border-b border-rule-soft py-4">
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="label mr-2 text-no">Went with the recording</span>
            The call service summarised this call in a way the recording does not support, so its
            summary was ignored. Everything on this page comes from what was actually said.
          </p>
        </div>
      ) : null}

      <section className="grid gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="label grid grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-rule-soft pb-2 text-muted">
            <span>Time</span>
            <span>Who</span>
            <span>The call</span>
          </div>
          {attempt.transcript.map((turn, index) => {
            const evidence = evidenceByTurn.get(index);
            const mine = turn.speaker === "user";
            return (
              <div
                key={index}
                id={`turn-${index}`}
                className="grid scroll-mt-6 grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-rule-soft py-3"
              >
                <span className="tnum pt-0.5 text-[12px] text-muted">{timecode(turn.offset_seconds)}</span>
                <span className={`label pt-1 ${mine ? "text-ink" : "text-muted"}`}>{mine ? "You" : "Them"}</span>
                <div>
                  <p className={`text-[15px] leading-relaxed ${mine ? "text-ink" : "text-ink-2"}`}>
                    <Marked text={turn.text} quote={evidence?.span?.quote ?? null} />
                  </p>
                  {evidence ? <p className="label mt-1.5 text-ink">↳ {evidence.description}</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        {card.verdicts.length > 0 ? (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="label border-b border-rule-soft pb-2 text-muted">What they needed to hear</p>
            <ul className="divide-y divide-rule-soft">
              {card.verdicts.map((verdict) => (
                <li key={verdict.id} className="flex gap-3 py-3">
                  <span
                    aria-hidden
                    className={`mt-1 size-2.5 shrink-0 ${verdict.met ? "bg-mark ring-1 ring-ink" : "ring-1 ring-muted"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[14px] leading-snug ${verdict.met ? "text-ink" : "text-muted"}`}>
                      {verdict.description}
                    </p>
                    {verdict.span ? (
                      <a href={`#turn-${verdict.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted hover:text-ink">
                        at {timecode(attempt.transcript[verdict.span.turn]?.offset_seconds ?? null)} →
                      </a>
                    ) : (
                      <p className="mt-1 text-[12px] leading-relaxed text-muted">{verdict.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 divide-y divide-rule-soft border-t border-rule-soft">
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
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className="tnum text-[13px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Nothing counts unless a line of the call proves it, which is why some of these say the
              call did not show it rather than saying you failed.
            </p>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
