import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { TakeCall } from "@/components/take-call";
import { isLive, previewDrill } from "@/lib/calle";
import { currentUser } from "@/lib/auth";
import { INTENTS, TONES, canSee, isIntentKey, isToneKey, listPersonaIds, loadPersona } from "@/lib/persona";
import type { CallSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Small counts read as words when they sit in a sentence. */
function spell(n: number): string {
  return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][n] ?? String(n);
}

export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!listPersonaIds().includes(id)) notFound();

  const query = await searchParams;
  const tone = isToneKey(query.tone) ? query.tone : "default";
  const intent = isIntentKey(query.intent) ? query.intent : "default";
  const settings: CallSettings | null = tone === "default" && intent === "default" ? null : { tone, intent };

  const persona = loadPersona(id);
  const user = await currentUser();
  if (!canSee(persona, user?.id ?? null)) notFound();
  const preview = previewDrill(persona, undefined, settings);
  const live = isLive();
  const provenance = persona.provenance ?? [];

  const href = (next: Partial<CallSettings>) => {
    const t = next.tone ?? tone;
    const i = next.intent ?? intent;
    const q = new URLSearchParams();
    if (t !== "default") q.set("tone", t);
    if (i !== "default") q.set("intent", i);
    const s = q.toString();
    return `/drill/${persona.id}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="px-5 py-6 md:px-12 md:py-10">
      <Link href="/" className="pill appear appear--scale d-1">
        ← All callers
      </Link>

      <header className="appear appear--soft d-2 mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex max-w-2xl gap-4 sm:gap-5">
          <span className="grid size-16 shrink-0 place-items-center bg-panel sm:size-20">
            <Avatar seed={persona.id} className="size-14 sm:size-[72px]" />
          </span>
          <div className="min-w-0">
            {persona.source === "profile" ? <span className="label mb-2 inline-block px-1.5 py-1 text-text">Yours</span> : null}
            <h1 className="h1 text-[26px] text-text md:text-[32px]">{persona.display_name}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-text-2">{persona.summary}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              They listen to what you say and come back at it in their own words. They do not open up
              until {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}, and they will
              not agree to a next step unless{" "}
              {persona.reads?.agrees_if ?? persona.hidden_state.concession}. They will push back on you
              at least {spell(persona.hidden_state.scripted_objections.length)} times, and you will not
              know when it is coming.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-2 lg:w-auto">
          <TakeCall personaId={persona.id} live={live} destinationMasked={preview.destinationMasked} tone={tone} intent={intent} />
          <p className="max-w-xs text-[12px] leading-relaxed text-muted">
            {live
              ? `Rings ${preview.destinationMasked}, your own number and nobody else's.`
              : "Nothing will ring. This plays a call that already happened, and scores it the way it would score yours."}
          </p>
        </div>
      </header>

      <section className="panel appear appear--soft d-3 mt-8 p-5">
        <p className="text-[14px] font-medium tracking-[-0.02em] text-text">How should they come at you?</p>
        <p className="mt-1 text-[13px] text-muted">
          Same person, different day. Pick the mood and what they walked in wanting; the call changes with it.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="label text-muted">Tone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(TONES).map(([key, t]) => (
                <Link key={key} href={href({ tone: key })} className={`pill ${tone === key ? "pill-on" : ""}`} scroll={false}>
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="label text-muted">What they want</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(INTENTS).map(([key, i]) => (
                <Link key={key} href={href({ intent: key })} className={`pill ${intent === key ? "pill-on" : ""}`} scroll={false}>
                  {i.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {provenance.length > 0 ? (
        <section className="panel appear appear--soft d-4 mt-6">
          <div className="panel-head px-5 py-3 md:px-6">
            <p className="label text-muted">How we read them</p>
          </div>
          <div className="label panel-head hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 px-6 py-2.5 text-muted md:grid">
            <span>They wrote</span>
            <span>So expect someone who</span>
            <span>Which sounds like</span>
          </div>
          {provenance.map((p) => (
            <div
              key={p.trait}
              className="grid gap-3 px-5 py-4 text-[14px] leading-relaxed md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6 md:px-6 md:py-3.5"
            >
              <div>
                <span className="label mb-1 block text-muted md:hidden">They wrote</span>
                <p className="serif text-[17px] text-text">“{p.because}”</p>
              </div>
              <div>
                <span className="label mb-1 block text-muted md:hidden">So expect someone who</span>
                <p className="text-text-2">{p.trait}</p>
              </div>
              <div>
                <span className="label mb-1 block text-muted md:hidden">Which sounds like</span>
                <p className="serif text-[17px] text-muted">“{p.objection}”</p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="appear appear--soft d-5 mt-6 grid gap-6 md:grid-cols-2">
        <div className="panel">
          <p className="label panel-head px-5 py-3 text-muted md:px-6">What they will do to you</p>
          <ul className="px-5 md:px-6">
            {persona.style.map((trait) => (
              <li key={trait} className="py-3 text-[14px] leading-relaxed text-text-2">
                {cap(trait)}.
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <p className="label panel-head px-5 py-3 text-muted md:px-6">What they need to hear</p>
          <ol className="px-5 md:px-6">
            {persona.rubric.map((item, index) => (
              <li key={item.id} className="flex items-baseline gap-4 py-3">
                <span className="tnum w-4 text-[12px] font-medium text-muted">{index + 1}</span>
                <span className="flex-1 text-[14px] leading-relaxed text-text-2">{item.description}</span>
                <span className="tnum text-[12px] text-muted">{item.weight} pts</span>
              </li>
            ))}
          </ol>
          <p className="px-5 py-3 text-[12px] leading-relaxed text-muted md:px-6">
            Each one is marked after the call only if a line of the recording proves it.
          </p>
        </div>
      </section>

      <details className="group appear appear--soft d-6 mt-6">
        <summary className="label flex cursor-pointer list-none items-center gap-2 py-2 text-muted transition-colors hover:text-text">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
          Read exactly what they will be told
        </summary>
        <pre className="panel mt-3 max-w-3xl px-5 py-5 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-muted md:px-6">
          {preview.task}
        </pre>
      </details>
    </div>
  );
}
