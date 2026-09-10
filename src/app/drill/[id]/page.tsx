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
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="grid gap-8 border-b-2 border-rule py-14 md:grid-cols-[1.3fr_1fr] md:items-end">
        <div>
          <Link href="/" className="label text-muted hover:text-ink">
            ← Someone else
          </Link>
          <h1 className="display mt-4 text-[56px] text-balance text-ink md:text-[80px]">
            {persona.display_name}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{persona.summary}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <TakeCall personaId={persona.id} live={live} destinationMasked={preview.destinationMasked} />
          <p className="max-w-xs text-sm leading-relaxed text-muted md:text-right">
            {live
              ? `Rings ${preview.destinationMasked}, your own number and nobody else's. They open by saying out loud that it is a rehearsal.`
              : "Nothing will ring. You will see a call that already happened, scored exactly the way a real one is."}
          </p>
        </div>
      </section>

      {provenance.length > 0 ? (
        <section className="border-b border-rule-soft py-12">
          <p className="label text-muted">How we read them</p>
          <div className="mt-6 grid gap-px bg-rule-soft md:grid-cols-3">
            {provenance.map((p) => (
              <div key={p.trait} className="bg-paper py-6 md:pr-8">
                <p className="label text-muted">They wrote</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink italic">“{p.because}”</p>
                <p className="label mt-5 text-muted">So expect someone who</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.trait}.</p>
                <p className="label mt-5 text-muted">Which sounds like</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">“{p.objection}”</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-12 py-12 md:grid-cols-2">
        <div>
          <p className="label text-muted">What they will do to you</p>
          <ul className="mt-5 divide-y divide-rule-soft border-t border-rule-soft">
            {persona.style.map((trait) => (
              <li key={trait} className="py-3 text-[15px] leading-relaxed text-ink-2">
                {cap(trait)}.
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            They only warm up if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
            They only agree to a next step if{" "}
            {persona.reads?.agrees_if ?? persona.hidden_state.concession}. Expect to be pushed at
            least {persona.hidden_state.scripted_objections.length} times, and you will not know
            when.
          </p>
        </div>

        <div>
          <p className="label text-muted">What they need to hear</p>
          <ol className="mt-5 divide-y divide-rule-soft border-t border-rule-soft">
            {persona.rubric.map((item, index) => (
              <li key={item.id} className="flex gap-5 py-3">
                <span className="display tnum w-6 text-[22px] text-muted">{index + 1}</span>
                <span className="text-[15px] leading-relaxed text-ink-2">{item.description}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            After the call, each of these is marked only if a line of the recording proves it.
          </p>
        </div>
      </section>

      <details className="group border-t-2 border-rule">
        <summary className="label flex cursor-pointer list-none items-center gap-3 py-5 text-ink">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
          Read exactly what they will be told
        </summary>
        <pre className="max-w-3xl overflow-x-auto pb-8 font-sans text-sm leading-relaxed whitespace-pre-wrap text-muted">
          {preview.task}
        </pre>
      </details>
    </div>
  );
}
