import Link from "next/link";
import { notFound } from "next/navigation";
import { TakeCall } from "@/components/take-call";
import { Tile } from "@/components/tile";
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
    <div className="px-8 py-10 md:px-12">
      <Link href="/" className="pill appear appear--scale d-1">
        ← All callers
      </Link>

      <header className="appear appear--soft d-2 mt-6 flex flex-wrap items-start justify-between gap-8">
        <div className="flex max-w-2xl gap-5">
          <Tile name={persona.display_name} mark={persona.source === "profile"} className="!size-14 !text-lg" />
          <div>
            <h1 className="h1 text-[32px] text-text">{persona.display_name}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-text-2">{persona.summary}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Warms up only if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
              Agrees to a next step only if{" "}
              {persona.reads?.agrees_if ?? persona.hidden_state.concession}. Expect to be pushed at
              least {persona.hidden_state.scripted_objections.length} times, and you will not know when.
            </p>
          </div>
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
        <section className="panel appear appear--soft d-3 mt-8 rounded-lg">
          <div className="border-b border-border-soft px-6 py-3">
            <p className="label text-muted">How we read them</p>
          </div>
          <div className="label grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 border-b border-border-soft px-6 py-2.5 text-muted">
            <span>They wrote</span>
            <span>So expect someone who</span>
            <span>Which sounds like</span>
          </div>
          {provenance.map((p) => (
            <div
              key={p.trait}
              className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 border-b border-border-soft px-6 py-3.5 text-[14px] leading-relaxed last:border-b-0"
            >
              <p className="serif text-[17px] text-text">“{p.because}”</p>
              <p className="text-text-2">{p.trait}</p>
              <p className="serif text-[17px] text-muted">“{p.objection}”</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="appear appear--soft d-4 mt-6 grid gap-6 md:grid-cols-2">
        <div className="panel rounded-lg">
          <p className="label border-b border-border-soft px-6 py-3 text-muted">What they will do to you</p>
          <ul className="divide-y divide-border-soft px-6">
            {persona.style.map((trait) => (
              <li key={trait} className="py-3 text-[14px] leading-relaxed text-text-2">
                {cap(trait)}.
              </li>
            ))}
          </ul>
        </div>
        <div className="panel rounded-lg">
          <p className="label border-b border-border-soft px-6 py-3 text-muted">What they need to hear</p>
          <ol className="divide-y divide-border-soft px-6">
            {persona.rubric.map((item, index) => (
              <li key={item.id} className="flex items-baseline gap-4 py-3">
                <span className="tnum w-4 text-[12px] font-medium text-muted">{index + 1}</span>
                <span className="flex-1 text-[14px] leading-relaxed text-text-2">{item.description}</span>
                <span className="tnum text-[12px] text-muted">{item.weight} pts</span>
              </li>
            ))}
          </ol>
          <p className="border-t border-border-soft px-6 py-3 text-[12px] leading-relaxed text-muted">
            Each one is marked after the call only if a line of the recording proves it.
          </p>
        </div>
      </section>

      <details className="group appear appear--soft d-5 mt-6">
        <summary className="label flex cursor-pointer list-none items-center gap-2 py-2 text-muted transition-colors hover:text-text">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
          Read exactly what they will be told
        </summary>
        <pre className="panel mt-3 max-w-3xl rounded-lg px-6 py-5 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-muted">
          {preview.task}
        </pre>
      </details>
    </div>
  );
}
