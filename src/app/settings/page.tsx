import Link from "next/link";
import { redirect } from "next/navigation";
import { PhoneForm } from "@/components/phone-form";
import { currentUser } from "@/lib/auth";
import { liveReadiness } from "@/lib/calle";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** One step between you and a ringing phone, and what to do about it. */
interface Step {
  done: boolean;
  title: string;
  detail: string;
}

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/settings");

  const live = liveReadiness(user.phone);
  const plan = PLANS.find((p) => p.id === user.plan);

  const steps: Step[] = [
    {
      done: !live.missing.includes("phone-missing") && !live.missing.includes("phone-invalid"),
      title: "A phone for Sparbird to ring",
      detail: live.locked
        ? `This copy of Sparbird is pinned to one phone, ${live.numberMasked}, and will not ring any other. Whoever set it up chose that.`
        : live.numberMasked
          ? `Calls go to ${live.numberMasked} and nowhere else.`
          : "Add your number below. Until it is there, nothing can be dialled.",
    },
    {
      done: live.hasKey,
      title: "A CALL-E key for the line itself",
      detail: live.hasKey
        ? "A key is loaded, so Sparbird can place calls."
        : "Whoever runs this copy needs to put a CALL-E developer key in CALLE_API_KEY. Without one there is no phone line.",
    },
    {
      done: live.liveFlag,
      title: "Live calling switched on",
      detail: live.liveFlag
        ? "Pressing the button on a caller will make your phone ring."
        : "This copy is running on recorded calls, which is the default so that nobody is rung by accident. Set SPARBIRD_LIVE=1 where it runs to turn real calls on.",
    },
  ];

  return (
    <div className="px-5 py-10 md:px-12 md:py-14">
      <header className="appear appear--soft d-1 max-w-3xl">
        <h1 className="h1 text-[30px] text-text md:text-[38px]">Your account</h1>
        <p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-muted">
          Signed in as {user.email}. The only thing Sparbird needs from you is the phone it should
          ring, because it rings yours and nobody else&rsquo;s.
        </p>
      </header>

      <section className="appear appear--soft d-2 mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`panel p-6 ${live.ready ? "panel-good" : ""}`}>
          <p className="label text-muted">Taking a real call</p>
          <p className="mt-2 text-[17px] leading-snug tracking-[-0.02em] text-text">
            {live.ready
              ? `Everything is set. Open any caller and your phone will ring on ${live.numberMasked}.`
              : "Three things have to be true before a phone can ring. Here is where you are."}
          </p>

          <ol className="mt-5 space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden
                  className={`dot mt-[7px] ${step.done ? "dot-good" : "dot-warn"}`}
                />
                <div className="min-w-0">
                  <p className={`text-[14px] font-medium ${step.done ? "text-text" : "text-text-2"}`}>
                    {i + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          {live.ready ? (
            <Link href="/" className="btn btn-solid mt-6">
              Pick someone to call you
            </Link>
          ) : (
            <p className="mt-6 text-[13px] leading-relaxed text-faint">
              Until all three are true, every caller still works: they play a call that already
              happened and score it exactly the way they would score yours.
            </p>
          )}
        </div>

        <div className="panel p-6">
          <PhoneForm phone={user.phone} locked={live.locked} />

          <div className="mt-8">
            <p className="label text-muted">What happens to it</p>
            <ul className="mt-3 space-y-2.5">
              {[
                "It is the only number this account will ever dial.",
                "Every call opens by saying out loud that it is a rehearsal, before anything else.",
                "Anything phone-shaped in a transcript is masked before it is stored.",
                "Remove it here and this account can no longer place a call.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5 text-[13.5px] leading-relaxed text-text-2">
                  <span aria-hidden className="dot dot-good mt-[7px]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="appear appear--soft d-3 mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="panel p-6">
          <p className="label text-muted">Your plan</p>
          <p className="mt-2 text-[17px] font-medium tracking-[-0.03em] text-text">
            {plan?.name ?? user.plan}
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            {plan ? `${plan.price} ${plan.cadence}. ${plan.minutes}.` : "No plan on file."}
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-faint">
            Billing is not switched on yet, so nothing has been charged to you. This is the plan you
            picked when you signed up.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href="/pricing" className="btn btn-ghost">
              See the plans
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Talk to us
            </Link>
          </div>
        </div>

        <div className="panel p-6">
          <p className="label text-muted">Where your calls are kept</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-2">
            Every call you take is written down with its transcript and its marking, and you can read
            any of them again from Past calls.
          </p>
          <Link href="/calls" className="btn btn-ghost mt-5">
            Past calls
          </Link>
        </div>
      </section>
    </div>
  );
}
