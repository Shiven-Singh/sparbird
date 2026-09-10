import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default function FromProfilePage() {
  const sample = JSON.parse(
    readFileSync(join(process.cwd(), "personas", "fixtures", "profile.sample.json"), "utf8"),
  ) as { name: string; headline: string; about: string; recent_posts: string[] };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="border-b-2 border-rule py-14">
        <p className="label text-muted">Build one from a profile</p>
        <h1 className="display mt-3 max-w-4xl text-[56px] text-balance text-ink md:text-[80px]">
          Practise on the person, not a type.
        </h1>
      </section>

      <section className="grid gap-12 py-12 md:grid-cols-[1.2fr_1fr]">
        <ProfileForm sample={sample} />

        <aside className="flex flex-col gap-8 md:border-l md:border-rule-soft md:pl-10">
          <div>
            <p className="label text-muted">What we read</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              How people describe their work and what they choose to post is a fair guide to how
              they will push back. Someone who writes about cost will open with cost. Someone
              tired of AI slides will ask you to skip the technology.
            </p>
          </div>
          <div>
            <p className="label text-muted">What you get</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              A person on the line with their priorities, their objections in the order they will
              raise them, and a checklist of what they need to hear. Every trait is shown next to
              the words that produced it, so you can see the working and disagree with it.
            </p>
          </div>
          <div>
            <p className="label text-muted">What is kept</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Their initials and their role. The name and the pasted text are used to build the
              persona and then dropped. The call itself only ever rings your phone.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
