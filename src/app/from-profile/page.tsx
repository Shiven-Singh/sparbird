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
    <div className="px-8 py-10 md:px-12">
      <Link href="/" className="pill appear appear--scale d-1">
        ← All callers
      </Link>

      <header className="appear appear--soft d-2 mt-6 max-w-3xl">
        <h1 className="h1 text-[36px] text-text">
          Practise on the <em>person</em>, not a type.
        </h1>
        <p className="mt-3 max-w-[520px] text-[15.5px] leading-[1.55] tracking-[-0.015em] text-muted">
          Paste what a real person says about themselves. We read it for how they will push back,
          show the working, and put them on the line.
        </p>
      </header>

      <section className="appear appear--soft d-3 mt-8 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="panel rounded-lg px-6 py-6">
          <ProfileForm sample={sample} />
        </div>

        <aside className="flex flex-col gap-6 md:pl-2">
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
              <p className="mt-2 text-[14px] leading-relaxed text-text-2">{body}</p>
            </div>
          ))}
        </aside>
      </section>
    </div>
  );
}
