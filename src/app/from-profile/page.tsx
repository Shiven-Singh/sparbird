import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default function FromProfilePage() {
  const sample = JSON.parse(
    readFileSync(join(process.cwd(), "personas", "fixtures", "profile.sample.json"), "utf8"),
  ) as { name: string; headline: string; about: string; recent_posts: string[] };

  return (
    <div className="px-8 py-8">
      <Link href="/" className="label text-muted hover:text-ink">
        ← All callers
      </Link>

      <header className="mt-4 border-b-2 border-rule pb-6">
        <h1 className="display text-[28px] text-ink">Build one from a profile</h1>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-2">
          Paste what a real person says about themselves. We read it for how they will push back,
          show the working, and put them on the line.
        </p>
      </header>

      <section className="grid gap-12 py-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ProfileForm sample={sample} />

        <aside className="flex flex-col gap-6 md:border-l md:border-rule-soft md:pl-10">
          {[
            [
              "What we read",
              "How people describe their work and what they choose to post is a fair guide to how they will push back. Someone who writes about cost will open with cost. Someone tired of AI slides will ask you to skip the technology.",
            ],
            [
              "What you get",
              "A person on the line with their priorities, their objections in the order they will raise them, and a checklist of what they need to hear. Every trait is shown next to the words that produced it, so you can see the working and disagree with it.",
            ],
            [
              "What is kept",
              "Their initials and their role. The name and the pasted text are used to build the persona and then dropped. The call itself only ever rings your phone.",
            ],
          ].map(([h, body]) => (
            <div key={h}>
              <p className="label text-muted">{h}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
