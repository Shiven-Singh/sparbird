import Link from "next/link";
import { notFound } from "next/navigation";
import { TakeCall } from "@/components/take-call";
import { isLive, previewDrill } from "@/lib/calle";
import { listPersonaIds, loadPersona } from "@/lib/persona";

export const dynamic = "force-dynamic";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!listPersonaIds().includes(id)) notFound();

  const persona = loadPersona(id);
  const preview = previewDrill(persona);
  const live = isLive();
  const provenance = persona.provenance ?? [];

  return (
    <div className="px-8 py-8">
      <Link href="/" className="label text-muted hover:text-ink">
        ← All callers
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6 border-b-2 border-rule pb-6">
        <div className="max-w-2xl">
          {persona.source === "profile" ? (
            <span className="label mb-2 inline-block bg-mark px-1.5 py-0.5 text-ink">From a profile</span>
          ) : null}
          <h1 className="display text-[28px] text-ink">{persona.display_name}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{persona.summary}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
            Agrees to a next step only if{" "}
            {persona.reads?.agrees_if ?? persona.hidden_state.concession}. Expect to be pushed at
            least {persona.hidden_state.scripted_objections.length} times, and you will not know when.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <TakeCall personaId={persona.id} live={live} destinationMasked={preview.destinationMasked} />
          <p className="max-w-xs text-[12px] leading-relaxed text-muted">
            {live
              ? `Rings ${preview.destinationMasked}, your own number and nobody else's.`
              : "Nothing will ring. A call that already happened, scored the way a real one is."}
          </p>
        </div>
      </header>

      {provenance.length > 0 ? (
        <section className="border-b border-rule-soft py-6">
          <p className="label text-muted">How we read them</p>
          <div className="label mt-4 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 border-b border-rule-soft pb-2 text-muted">
            <span>They wrote</span>
            <span>So expect someone who</span>
            <span>Which sounds like</span>
          </div>
          {provenance.map((p) => (
            <div
              key={p.trait}
              className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 border-b border-rule-soft py-3 text-[14px] leading-relaxed"
            >
              <p className="text-ink italic">“{p.because}”</p>
              <p className="text-ink-2">{p.trait}</p>
              <p className="text-ink">“{p.objection}”</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-10 py-6 md:grid-cols-2">
        <div>
          <p className="label text-muted">What they will do to you</p>
          <ul className="mt-3 divide-y divide-rule-soft border-y border-rule-soft">
            {persona.style.map((trait) => (
              <li key={trait} className="py-2.5 text-[14px] leading-relaxed text-ink-2">
                {cap(trait)}.
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label text-muted">What they need to hear</p>
          <ol className="mt-3 divide-y divide-rule-soft border-y border-rule-soft">
            {persona.rubric.map((item, index) => (
              <li key={item.id} className="flex items-baseline gap-4 py-2.5">
                <span className="tnum w-4 text-[12px] font-semibold text-muted">{index + 1}</span>
                <span className="flex-1 text-[14px] leading-relaxed text-ink-2">{item.description}</span>
                <span className="tnum text-[12px] text-muted">{item.weight} pts</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12px] leading-relaxed text-muted">
            Each one is marked after the call only if a line of the recording proves it.
          </p>
        </div>
      </section>

      <details className="group border-t border-rule-soft">
        <summary className="label flex cursor-pointer list-none items-center gap-2 py-4 text-muted hover:text-ink">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
          Read exactly what they will be told
        </summary>
        <pre className="max-w-3xl pb-6 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-muted">
          {preview.task}
        </pre>
      </details>
    </div>
  );
}
