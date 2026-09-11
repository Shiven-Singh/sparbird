import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { loadPersona } from "@/lib/persona";
import type { FlagKind, RubricVerdict } from "@/lib/types";

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

const FLAG_LABEL: Record<FlagKind, string> = {
  overclaim: "Absolute claim",
  unbacked_claim: "Nothing behind it",
  promise: "You promised",
  pressure: "Pressure",
  disparagement: "Ran them down",
};

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
  const review = card.review;

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
  const flagsByTurn = new Map<number, string>();
  for (const f of review?.flags ?? []) flagsByTurn.set(f.span.turn, FLAG_LABEL[f.kind]);

  const at = (turn: number) => timecode(attempt.transcript[turn]?.offset_seconds ?? null);

  const subtitle = unscored
    ? card.unscoredReason
    : landed.length < card.itemsTotal && card.weakestMoment
      ? `Where it slipped: ${lower(card.weakestMoment)}`
      : card.strongestMoment
        ? `What did it: ${lower(card.strongestMoment)}`
        : "";

  return (
    <div className="px-8 py-8 md:px-10">
      <div className="flex items-center gap-3">
        <Link href={`/drill/${attempt.personaId}`} className="label text-muted hover:text-ink">
          ← {who}
        </Link>
        <span className="label text-muted">· {attempt.live ? "a real call" : "a recorded call"}</span>
      </div>

      <header className="rise mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="display text-[34px] leading-tight text-ink">
            {unscored ? "We are not grading this one." : outcomeLine(card.personaVerdict, landed.length, card.itemsTotal)}
          </h1>
          {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p> : null}
        </div>
        {!unscored ? (
          <div className="flex items-baseline gap-2">
            <span className="display tnum text-[56px] leading-none text-ink">{landed.length}</span>
            <span className="display tnum text-[24px] leading-none text-muted">/ {card.itemsTotal}</span>
            <span className="label ml-2 text-muted">landed</span>
          </div>
        ) : null}
      </header>

      {card.disputed ? (
        <p className="mt-5 text-[13px] leading-relaxed text-ink-2">
          <span className="label mr-2 text-no">Went with the recording</span>
          The call service summarised this call in a way the recording does not support, so its
          summary was ignored. Everything on this page comes from what was actually said.
        </p>
      ) : null}

      {review ? (
        <section className="rise rise-2 mt-8 grid gap-6 lg:grid-cols-3">
          <div className="sheet">
            <p className="label border-b border-rule-soft px-5 py-3 text-muted">What worked</p>
            <ul className="divide-y divide-rule-soft px-5">
              {review.good.length === 0 ? (
                <li className="py-3 text-[13px] text-muted">Nothing landed on this call.</li>
              ) : (
                review.good.map((p, i) => (
                  <li key={i} className="py-3">
                    <p className="text-[14px] leading-relaxed text-ink">{p.text}</p>
                    {p.span ? (
                      <a href={`#turn-${p.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted hover:text-ink">
                        at {at(p.span.turn)} →
                      </a>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sheet">
            <p className="label border-b border-rule-soft px-5 py-3 text-muted">What hurt</p>
            <ul className="divide-y divide-rule-soft px-5">
              {review.bad.length === 0 ? (
                <li className="py-3 text-[13px] text-muted">Nothing on this call worked against you.</li>
              ) : (
                review.bad.map((p, i) => (
                  <li key={i} className="py-3">
                    <p className="text-[14px] leading-relaxed text-ink-2">{p.text}</p>
                    {p.span ? (
                      <a href={`#turn-${p.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted hover:text-ink">
                        at {at(p.span.turn)} →
                      </a>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="sheet">
            <p className="label border-b border-rule-soft px-5 py-3 text-muted">Watch out</p>
            <ul className="divide-y divide-rule-soft px-5">
              {review.flags.length === 0 ? (
                <li className="py-3 text-[13px] text-muted">
                  Nothing you said needs walking back. No promises, no absolutes, no pressure.
                </li>
              ) : (
                review.flags.map((f, i) => (
                  <li key={i} className="py-3">
                    <p className="label text-ink">{FLAG_LABEL[f.kind]}</p>
                    <p className="display mt-1 text-[15px] leading-snug text-ink italic">“{f.span.quote}”</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{f.note}</p>
                    <a href={`#turn-${f.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted hover:text-ink">
                      at {at(f.span.turn)} →
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="rise rise-3 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="sheet">
          <div className="label grid grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-rule-soft px-6 py-3 text-muted">
            <span>Time</span>
            <span>Who</span>
            <span>The call</span>
          </div>
          {attempt.transcript.map((turn, index) => {
            const evidence = evidenceByTurn.get(index);
            const flag = flagsByTurn.get(index);
            const mine = turn.speaker === "user";
            return (
              <div
                key={index}
                id={`turn-${index}`}
                className="grid scroll-mt-6 grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-rule-soft px-6 py-3.5 last:border-b-0"
              >
                <span className="tnum pt-0.5 text-[12px] text-muted">{timecode(turn.offset_seconds)}</span>
                <span className={`label pt-1 ${mine ? "text-ink" : "text-muted"}`}>{mine ? "You" : "Them"}</span>
                <div>
                  <p className={`text-[15px] leading-relaxed ${mine ? "text-ink" : "text-ink-2"}`}>
                    <Marked text={turn.text} quote={evidence?.span?.quote ?? null} />
                  </p>
                  {evidence ? <p className="label mt-1.5 text-ink">↳ {evidence.description}</p> : null}
                  {flag ? <p className="label mt-1.5 text-no">↳ {flag}</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        {card.verdicts.length > 0 ? (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="sheet">
              <p className="label border-b border-rule-soft px-5 py-3 text-muted">What they needed to hear</p>
              <ul className="divide-y divide-rule-soft px-5">
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
                          at {at(verdict.span.turn)} →
                        </a>
                      ) : (
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">{verdict.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="divide-y divide-rule-soft border-t border-rule-soft px-5">
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
                    <dt className="text-[13px] text-muted">{k}</dt>
                    <dd className="tnum text-[13px] text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Nothing counts unless a line of the call proves it, which is why some of these say the
              call did not show it rather than saying you failed.
            </p>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
