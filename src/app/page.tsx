import Link from "next/link";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "1",
    title: "Pick who calls you",
    body: "An investor who wants a number in the first minute. A finance lead who only wants to talk price. A hiring manager who does not accept a job title as an answer.",
  },
  {
    n: "2",
    title: "Answer your phone",
    body: "Five minutes, out loud, on a real line. They interrupt, they push, and they make up their mind about you.",
  },
  {
    n: "3",
    title: "See where you lost them",
    body: "Every note points at the line where it happened, in their words and yours. Nothing is graded that the call did not actually show.",
  },
];

export default function Home() {
  const personas = loadAllPersonas();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
      <header>
        <h1 className="font-display text-4xl leading-[1.15] tracking-tight text-balance text-ink md:text-5xl">
          Walk in having already had the conversation.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
          Your phone rings. The person you are about to pitch picks up, pushes back the way they
          will on the day, and decides. You get to find out how it goes before it counts.
        </p>
      </header>

      <ol className="mt-14 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="bg-surface p-5">
            <span className="font-display text-sm text-brass">{step.n}</span>
            <h2 className="mt-2 text-[15px] font-medium text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <section className="mt-16">
        <h2 className="font-display text-2xl tracking-tight text-ink">Who do you want on the line?</h2>
        <p className="mt-2 text-[15px] text-muted">
          Each one is difficult in a different way, and each one is winnable.
        </p>

        <div className="mt-6 space-y-3">
          {personas.map((persona) => (
            <Link
              key={persona.id}
              href={`/drill/${persona.id}`}
              className="group block rounded-md border border-line bg-surface p-6 transition-colors hover:border-brass-dim"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl tracking-tight text-ink">
                  {persona.display_name}
                </h3>
                <span className="shrink-0 text-xs text-muted">{persona.max_minutes} minutes</span>
              </div>

              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">
                {persona.summary}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                <span className="text-ink-2">They only say yes if</span>{" "}
                {persona.reads?.engages_if ?? persona.hidden_state.engages_only_if}.
              </p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-brass">
                Take this call
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-line pt-6">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Sparbird only ever calls you. There is no contact list and no way to point it at somebody
          else, and every call opens by saying out loud that it is a rehearsal.
        </p>
      </footer>
    </div>
  );
}
