import { ContactForm } from "@/components/contact-form";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ANSWERS: Array<[string, string]> = [
  [
    "How quickly can a team be on it?",
    "Same day. There is nothing to install and nothing to connect: everyone adds their own number and starts taking calls.",
  ],
  [
    "Can we use our own callers?",
    "Yes. On Custom you write the people your team actually sells to, in your words, and they become the callers everyone practises against.",
  ],
  [
    "Whose phone rings?",
    "Only the person taking the rehearsal, on the number saved to their own account. There is no way to point Sparbird at a customer.",
  ],
];

export default async function ContactPage() {
  const user = await currentUser();

  return (
    <div className="px-5 py-10 md:px-12 md:py-14">
      <header className="appear appear--soft d-1 max-w-3xl">
        <h1 className="h1 text-[30px] text-text md:text-[40px]">
          Tell us what your team is <em>up against</em>.
        </h1>
        <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.55] text-muted">
          Custom is for brokerages, coaches, bootcamps and anyone handing practice to a whole
          cohort. Write down what you are trying to do and you will get a real answer from a person,
          not a booking link.
        </p>
      </header>

      <div className="appear appear--soft d-2 mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ContactForm defaultEmail={user?.email} />

        <div className="panel p-6">
          <p className="label text-muted">Asked most often</p>
          <dl className="mt-4 space-y-5">
            {ANSWERS.map(([q, a]) => (
              <div key={q}>
                <dt className="text-[14px] font-medium text-text">{q}</dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
