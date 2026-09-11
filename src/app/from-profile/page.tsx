import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { AudienceUpload } from "@/components/audience-upload";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default function FromProfilePage() {
  const sample = JSON.parse(
    readFileSync(join(process.cwd(), "personas", "fixtures", "profile.sample.json"), "utf8"),
  ) as { name: string; headline: string; about: string; recent_posts: string[] };

  return (
    <div className="px-5 py-6 md:px-12 md:py-10">
      <Link href="/" className="pill appear appear--scale d-1">
        ← All callers
      </Link>

      <header className="appear appear--soft d-2 mt-6 max-w-3xl">
        <h1 className="h1 text-[30px] text-text md:text-[40px]">
          Bring your own <em>audience</em>.
        </h1>
        <p className="mt-3 max-w-[560px] text-[15.5px] leading-[1.55] tracking-[-0.015em] text-muted">
          The people you actually have to convince. Paste what one of them says about themselves, or
          upload a list and get all of them on the line. We read each one for how they will push
          back, show the working, and let you rehearse before the real thing.
        </p>
      </header>

      <section className="appear appear--soft d-3 mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="panel rounded-lg px-5 py-5 md:px-6 md:py-6">
            <p className="text-[14px] font-medium tracking-[-0.02em] text-text">One person</p>
            <p className="mt-1 mb-5 text-[13px] text-muted">Their headline, what they say about themselves, a few things they have posted.</p>
            <ProfileForm sample={sample} />
          </div>

          <div className="panel relative rounded-lg px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium tracking-[-0.02em] text-text">From a LinkedIn link</p>
                <p className="mt-1 text-[13px] text-muted">
                  One link, and we read the profile for you: headline, about, recent posts, then build
                  the person. Until then, paste the text above.
                </p>
              </div>
              <span className="label shrink-0 rounded-sm border border-border px-1.5 py-1 text-text">Coming soon</span>
            </div>
            <div className="mt-4 flex gap-2">
              <input className="field" placeholder="https://www.linkedin.com/in/…" disabled aria-disabled />
              <span className="btn btn-ghost shrink-0 opacity-45">Read them</span>
            </div>
          </div>

          <div className="panel rounded-lg px-5 py-5 md:px-6 md:py-6">
            <p className="text-[14px] font-medium tracking-[-0.02em] text-text">Many at once</p>
            <p className="mt-1 mb-5 text-[13px] text-muted">
              Your prospect list, your investor list, the panel you are interviewing with. Up to fifty in one go.
            </p>
            <AudienceUpload />
          </div>
        </div>

        <aside className="flex flex-col gap-6 lg:pl-2">
          {[
            [
              "What we read",
              "How people describe their work and what they choose to post is a fair guide to how they will push back. Someone who writes about cost will open with cost. Someone tired of AI slides will ask you to skip the technology.",
            ],
            [
              "What you get",
              "A person on the line who listens to your pitch and comes back at it with their own priorities, their objections in the order they will raise them, and a checklist of what they need to hear. Every trait is shown next to the words that produced it, so you can see the working and disagree with it.",
            ],
            [
              "What is kept",
              "Their initials and their role. The name and the pasted text are used to build the persona and then dropped. The call itself only ever rings your phone; nobody on your list is ever dialed.",
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
