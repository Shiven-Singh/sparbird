import Link from "next/link";
import { notFound } from "next/navigation";
import { TakeCall } from "@/components/take-call";
import { isLive, previewDrill } from "@/lib/calle";
import { listPersonaIds, loadPersona } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default async function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!listPersonaIds().includes(id)) notFound();

  const persona = loadPersona(id);
  const preview = previewDrill(persona);
  const live = isLive();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-ink-2">
        ← Someone else
      </Link>

      <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-balance text-ink">
        {persona.display_name}
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">{persona.summary}</p>

      <section className="mt-12">
        <h2 className="text-xs tracking-wide text-muted uppercase">What they will do to you</h2>
        <ul className="mt-4 space-y-2.5">
          {persona.style.map((trait) => (
            <li key={trait} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
              <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-brass-dim" />
              {trait.charAt(0).toUpperCase() + trait.slice(1)}.
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-md border border-line bg-surface p-6">
        <h2 className="text-xs tracking-wide text-muted uppercase">How they make up their mind</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          They only warm up if {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
          They only agree to a next step if{" "}
          {persona.reads?.agrees_if ?? persona.hidden_state.concession}.
        </p>
        {persona.hidden_state.scripted_objections.length > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Expect to be pushed at least {persona.hidden_state.scripted_objections.length} times.
            You will not know exactly when.
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-xs tracking-wide text-muted uppercase">What you are being judged on</h2>
        <ul className="mt-4 space-y-2">
          {persona.rubric.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-2">
              <span className="text-[15px] text-ink-2">{item.description}</span>
              <span className="shrink-0 text-xs text-muted">{item.weight} pts</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <TakeCall personaId={persona.id} live={live} destinationMasked={preview.destinationMasked} />
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {live
            ? `This rings ${preview.destinationMasked}, your own number, and nobody else's. They open by saying out loud that it is a rehearsal.`
            : "Nothing will ring. You will see a call that already happened, scored exactly the way a real one is."}
        </p>
      </section>

      <details className="group mt-10 rounded-md border border-line bg-surface">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm text-ink-2 transition-colors hover:text-ink">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
          Read exactly what they will be told
        </summary>
        <pre className="overflow-x-auto border-t border-line px-6 py-5 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">
          {preview.task}
        </pre>
      </details>
    </div>
  );
}
