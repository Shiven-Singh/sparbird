import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { CallPlayback } from "@/components/call-playback";
import { getStore } from "@/lib/db";
import { describeSettings, loadPersona } from "@/lib/persona";
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

/** The line, with the words that mattered under a highlighter: white for a point earned,
 *  amber for something to walk back. */
function Marked({ text, quote, tone = "good" }: { text: string; quote: string | null; tone?: "good" | "warn" }) {
  if (!quote) return <>{text}</>;
  const cls = tone === "warn" ? "warn" : undefined;
  const at = text.indexOf(quote);
  if (at === -1) return <mark className={cls}>{text}</mark>;
  return (
    <>
      {text.slice(0, at)}
      <mark className={cls}>{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const attempt = store.get(decodeURIComponent(id));
  if (!attempt) notFound();
  const viewer = await currentUser();
  // A call belongs to the account that took it; the seeded samples belong to nobody.
  if (attempt.userId !== null && attempt.userId !== (viewer?.id ?? null)) notFound();

  const card = attempt.card;
  const landed = card.verdicts.filter((v) => v.met);
  const unscored = card.disposition === "unscored";
  const review = card.review;
  const settingsLine = describeSettings(card.settings);

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
  const flagsByTurn = new Map<number, { label: string; quote: string }>();
  for (const f of review?.flags ?? []) flagsByTurn.set(f.span.turn, { label: FLAG_LABEL[f.kind], quote: f.span.quote });

  const at = (turn: number) => timecode(attempt.transcript[turn]?.offset_seconds ?? null);

  const subtitle = unscored
    ? card.unscoredReason
    : landed.length < card.itemsTotal && card.weakestMoment
      ? `Where it slipped: ${lower(card.weakestMoment)}`
      : card.strongestMoment
        ? `What did it: ${lower(card.strongestMoment)}`
        : "";

  const rowCols = "grid-cols-[38px_42px_minmax(0,1fr)] sm:grid-cols-[48px_52px_minmax(0,1fr)]";

  return (
    <div className="px-5 py-6 md:px-12 md:py-10">
      <div className="appear appear--scale d-1 flex flex-wrap items-center gap-3">
        <Link href={`/drill/${attempt.personaId}`} className="pill">
          ← {who}
        </Link>
        <span className="label text-muted">{attempt.live ? "a real call" : "a recorded call"}</span>
      </div>

      <header className="appear appear--soft d-2 mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="max-w-2xl">
          <h1 className="h1 text-[28px] text-text md:text-[36px]">
            {unscored ? <>We are not grading <em>this</em> one.</> : <Outcome verdict={card.personaVerdict} landed={landed.length} total={card.itemsTotal} />}
          </h1>
          {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p> : null}
          {settingsLine ? <p className="mt-1.5 text-[13px] text-faint">{settingsLine}</p> : null}
        </div>
        {!unscored ? (
          <div className="flex items-baseline gap-2">
            <span
              className={`tnum text-[48px] leading-none font-medium tracking-[-0.05em] md:text-[56px] ${
                landed.length === card.itemsTotal ? "text-good" : landed.length === 0 ? "text-bad" : "text-text"
              }`}
            >
              {landed.length}
            </span>
            <span className="tnum text-[22px] leading-none text-muted">/ {card.itemsTotal}</span>
            <span className="label ml-2 text-muted">landed</span>
          </div>
        ) : null}
      </header>

      {card.disputed ? (
        <p className="appear appear--soft d-3 mt-5 text-[13px] leading-relaxed text-text-2">
          <span className="label mr-2 bg-warn-soft px-1.5 py-0.5 text-warn">Went with the recording</span>
          The call service summarized this call in a way the recording does not support, so its
          summary was ignored. Everything on this page comes from what was actually said.
        </p>
      ) : null}

      {review ? (
        <section className="appear appear--soft d-3 mt-8 grid gap-4 lg:grid-cols-3 lg:gap-6">
          {[
            ["What worked", review.good, "Nothing landed on this call.", "good"],
            ["What hurt", review.bad, "Nothing on this call worked against you.", "bad"],
          ].map(([title, points, empty, tone]) => (
            <div key={title as string} className={`panel ${tone === "good" ? "panel-good" : "panel-bad"}`}>
              <p className={`label panel-head px-5 py-3 ${tone === "good" ? "text-good" : "text-bad"}`}>
                {title as string}
              </p>
              <ul className="px-5">
                {(points as typeof review.good).length === 0 ? (
                  <li className="py-3 text-[13px] text-muted">{empty as string}</li>
                ) : (
                  (points as typeof review.good).map((p, i) => (
                    <li key={i} className="flex gap-2.5 py-3">
                      <span aria-hidden className={`dot mt-[7px] ${tone === "good" ? "dot-good" : "dot-bad"}`} />
                      <div className="min-w-0 flex-1">
                      <p className={`text-[14px] leading-relaxed ${title === "What worked" ? "text-text" : "text-text-2"}`}>{p.text}</p>
                      {p.span ? (
                        <a href={`#turn-${p.span.turn}`} className="tnum mt-1 inline-block text-[12px] text-muted transition-colors hover:text-text">
                          at {at(p.span.turn)} →
                        </a>
                      ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}

          <div className="panel panel-warn">
            <p className="label panel-head px-5 py-3 text-warn">Watch out</p>
            <ul className="px-5">
              {review.flags.length === 0 ? (
                <li className="py-3 text-[13px] text-muted">
                  Nothing you said needs walking back. No promises, no absolutes, no pressure.
                </li>
              ) : (
                review.flags.map((f, i) => (
                  <li key={i} className="py-3">
                    <p className="label flex items-center gap-2 text-warn">
                      <span aria-hidden className="dot dot-warn" />
                      {FLAG_LABEL[f.kind]}
                    </p>
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

      <div className="appear appear--soft d-4 mt-6">
        <CallPlayback
          transcript={attempt.transcript}
          recordingUrl={attempt.recordingUrl}
          providerCallId={attempt.providerCallId}
          live={attempt.live}
        />
      </div>

      <section className="appear appear--soft d-4 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="panel">
          <div className={`label panel-head grid ${rowCols} gap-x-3 px-4 py-3 text-muted sm:gap-x-4 sm:px-6`}>
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
                data-turn={index}
                className={`turn grid ${rowCols} scroll-mt-6 gap-x-3 px-4 py-3.5 sm:gap-x-4 sm:px-6 ${mine ? "" : "turn-them"}`}
              >
                <span className="tnum pt-0.5 text-[12px] text-faint">{timecode(turn.offset_seconds)}</span>
                <span className={`label pt-1 ${mine ? "text-text" : "text-faint"}`}>{mine ? "You" : "Them"}</span>
                <div className="min-w-0">
                  <p className={`text-[15px] leading-relaxed ${mine ? "text-text" : "text-muted"}`}>
                    <Marked
                      text={turn.text}
                      quote={evidence?.span?.quote ?? flag?.quote ?? null}
                      tone={evidence ? "good" : "warn"}
                    />
                  </p>
                  {evidence ? (
                    <p className="label mt-1.5 flex items-center gap-2 text-good">
                      <span aria-hidden className="dot dot-good" />
                      {evidence.description}
                    </p>
                  ) : null}
                  {flag ? (
                    <p className="label mt-1.5 flex items-center gap-2 text-warn">
                      <span aria-hidden className="dot dot-warn" />
                      {flag.label}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {card.verdicts.length > 0 ? (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="panel">
              <p className="label panel-head px-5 py-3 text-muted">What they needed to hear</p>
              <ul className="px-5">
                {card.verdicts.map((verdict) => (
                  <li key={verdict.id} className="flex gap-3 py-3">
                    <span aria-hidden className={`dot mt-1.5 ${verdict.met ? "dot-good" : "dot-none"}`} />
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
              <p className="label panel-head px-5 py-3 text-muted">How the call ran</p>
              <dl className="px-5 py-1.5">
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
