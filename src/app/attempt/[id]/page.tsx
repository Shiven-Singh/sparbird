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

/** The outcome as a headline, with one word carrying the serif. */
function Outcome({ verdict, landed, total }: { verdict: string | null; landed: number; total: number }) {
  if (verdict === "would_take_meeting") return <>They would take the <em>meeting</em>.</>;
  if (verdict === "would_not") return <>They <em>passed</em>.</>;
  if (landed === 0) return <>Nothing you said got <em>through</em>.</>;
  if (landed === total) return <>You got everything you <em>needed</em>.</>;
  return <>You got <em>partway</em> there.</>;
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
    <div className="px-8 py-10 md:px-12">
      <div className="appear appear--scale d-1 flex flex-wrap items-center gap-3">
        <Link href={`/drill/${attempt.personaId}`} className="pill">
          ← {who}
        </Link>
        <span className="label text-muted">{attempt.live ? "a real call" : "a recorded call"}</span>
      </div>

      <header className="appear appear--soft d-2 mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="h1 text-[36px] text-text">
            {unscored ? <>We are not grading <em>this</em> one.</> : <Outcome verdict={card.personaVerdict} landed={landed.length} total={card.itemsTotal} />}
          </h1>
          {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
        {!unscored ? (
          <div className="flex items-baseline gap-2">
            <span className="tnum text-[56px] leading-none font-medium tracking-[-0.05em] text-text">{landed.length}</span>
            <span className="tnum text-[22px] leading-none text-muted">/ {card.itemsTotal}</span>
            <span className="label ml-2 text-muted">landed</span>
          </div>
        ) : null}
      </header>

      {card.disputed ? (
        <p className="appear appear--soft d-3 mt-5 text-[13px] leading-relaxed text-text-2">
          <span className="label mr-2 rounded-sm border border-border px-1.5 py-0.5 text-text">Went with the recording</span>
          The call service summarised this call in a way the recording does not support, so its
          summary was ignored. Everything on this page comes from what was actually said.
        </p>
      ) : null}

      {review ? (
        <section className="appear appear--soft d-3 mt-8 grid gap-6 lg:grid-cols-3">
          {[
            ["What worked", review.good, "Nothing landed on this call."],
            ["What hurt", review.bad, "Nothing on this call worked against you."],
          ].map(([title, points, empty]) => (
            <div key={title as string} className="panel rounded-lg">
              <p className="label border-b border-border-soft px-5 py-3 text-muted">{title as string}</p>
              <ul className="divide-y divide-border-soft px-5">
                {(points as typeof review.good).length === 0 ? (
                  <li className="py-3 text-[13px] text-muted">{empty as string}</li>
                ) : (
                  (points as typeof review.good).map((p, i) => (
                    <li key={i} className="py-3">
                      <p className={`text-[14px] leading-relaxed ${title === "What worked" ? "text-text" : "text-text-2"}`}>{p.text}</p>
                      {p.span ? (
                        <a href={`#turn-${p.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted transition-colors hover:text-text">
                          at {at(p.span.turn)} →
                        </a>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}

          <div className="panel rounded-lg">
            <p className="label border-b border-border-soft px-5 py-3 text-muted">Watch out</p>
            <ul className="divide-y divide-border-soft px-5">
              {review.flags.length === 0 ? (
                <li className="py-3 text-[13px] text-muted">
                  Nothing you said needs walking back. No promises, no absolutes, no pressure.
                </li>
              ) : (
                review.flags.map((f, i) => (
                  <li key={i} className="py-3">
                    <p className="label text-text">{FLAG_LABEL[f.kind]}</p>
                    <p className="serif mt-1.5 text-[18px] leading-snug text-text">“{f.span.quote}”</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">{f.note}</p>
                    <a href={`#turn-${f.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted transition-colors hover:text-text">
                      at {at(f.span.turn)} →
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="appear appear--soft d-4 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="panel rounded-lg">
          <div className="label grid grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-border-soft px-6 py-3 text-muted">
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
                className="grid scroll-mt-6 grid-cols-[48px_52px_minmax(0,1fr)] gap-x-4 border-b border-border-soft px-6 py-3.5 last:border-b-0"
              >
                <span className="tnum pt-0.5 text-[12px] text-faint">{timecode(turn.offset_seconds)}</span>
                <span className={`label pt-1 ${mine ? "text-text" : "text-faint"}`}>{mine ? "You" : "Them"}</span>
                <div>
                  <p className={`text-[15px] leading-relaxed ${mine ? "text-text" : "text-muted"}`}>
                    <Marked text={turn.text} quote={evidence?.span?.quote ?? null} />
                  </p>
                  {evidence ? <p className="label mt-1.5 text-text">↳ {evidence.description}</p> : null}
                  {flag ? <p className="label mt-1.5 text-text underline decoration-dotted underline-offset-4">↳ {flag}</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        {card.verdicts.length > 0 ? (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="panel rounded-lg">
              <p className="label border-b border-border-soft px-5 py-3 text-muted">What they needed to hear</p>
              <ul className="divide-y divide-border-soft px-5">
                {card.verdicts.map((verdict) => (
                  <li key={verdict.id} className="flex gap-3 py-3">
                    <span
                      aria-hidden
                      className={`mt-1 size-2.5 shrink-0 rounded-sm ${verdict.met ? "bg-text" : "ring-1 ring-muted"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] leading-snug ${verdict.met ? "text-text" : "text-muted"}`}>
                        {verdict.description}
                      </p>
                      {verdict.span ? (
                        <a href={`#turn-${verdict.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted transition-colors hover:text-text">
                          at {at(verdict.span.turn)} →
                        </a>
                      ) : (
                        <p className="mt-1 text-[12px] leading-relaxed text-faint">{verdict.reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="divide-y divide-border-soft border-t border-border-soft px-5">
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
                    <dd className="tnum text-[13px] text-text">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              Nothing counts unless a line of the call proves it, which is why some of these say the
              call did not show it rather than saying you failed.
            </p>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
