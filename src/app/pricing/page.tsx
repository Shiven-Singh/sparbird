import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { COST_NOTE, PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const FAQ: Array<[string, string]> = [
  [
    "Why minutes and not calls?",
    "A two-minute hang-up and a nine-minute negotiation are not the same thing. You pay for the time you actually spend on the line, and nothing else.",
  ],
  [
    "What happens when the minutes run out?",
    "Nothing breaks. Extra minutes are $0.40, and you set the cap yourself, so a heavy week cannot turn into a surprise bill.",
  ],
  [
    "Do unused minutes roll over?",
    "On Fixed, minutes pool across the whole team each month, so the people who drill hardest use the most. They do not carry into the next month.",
  ],
  [
    "Who does it call?",
    "You. Only ever the number on your own account, and every call opens by saying out loud that it is a rehearsal. There is no contact list and no way to point it at somebody else.",
  ],
  [
    "Can I cancel?",
    "Any time, from your account. Monthly plans stop at the end of the month you are in.",
  ],
];

export default async function PricingPage() {
  const user = await currentUser();

  return (
    <div className="px-5 py-10 md:px-12 md:py-14">
      <header className="appear appear--soft d-1 max-w-3xl">
        <h1 className="h1 text-[34px] text-text md:text-[44px]">
          Pay for the <em>minutes</em> you talk.
        </h1>
        <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.55] text-muted">
          One person or a whole floor. Nothing is metered except time on the line, the price is on
          this page rather than behind a demo, and you can see what a minute costs us at the bottom.
        </p>
      </header>

      <section className="appear appear--soft d-2 mt-10 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`panel flex flex-col rounded-lg p-6 ${plan.featured ? "border-border panel-good" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-medium tracking-[-0.03em] text-text">{plan.name}</h2>
              {plan.featured ? <span className="label text-good">Most teams</span> : null}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{plan.who}</p>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="tnum text-[40px] leading-none font-medium tracking-[-0.04em] text-text">{plan.price}</span>
              <span className="text-[13px] text-muted">{plan.cadence}</span>
            </div>
            <p className="mt-2 text-[14px] text-text-2">{plan.minutes}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-[13.5px] leading-relaxed text-text-2">
                  <span aria-hidden className="dot dot-good mt-[7px]" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.id === "custom" ? "mailto:hello@sparbird.com?subject=Sparbird%20for%20our%20team" : `/signup?plan=${plan.id}`}
              className={`btn mt-6 w-full ${plan.featured ? "btn-solid" : "btn-ghost"}`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </section>

      <p className="appear appear--soft d-3 mt-6 max-w-2xl text-[13px] leading-relaxed text-faint">{COST_NOTE}</p>

      <section className="appear appear--soft d-4 mt-14 max-w-3xl">
        <h2 className="text-[20px] font-medium tracking-[-0.03em] text-text">Questions people actually ask</h2>
        <dl className="mt-5 divide-y divide-border-soft border-t border-border-soft">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-4">
              <dt className="text-[15px] font-medium text-text">{q}</dt>
              <dd className="mt-1.5 text-[14px] leading-relaxed text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {!user ? (
        <p className="mt-10 text-[14px] text-muted">
          Already have an account?{" "}
          <Link href="/signin" className="text-text underline decoration-dotted underline-offset-4">
            Sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}
