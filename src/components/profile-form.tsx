"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Sample {
  name: string;
  headline: string;
  about: string;
  recent_posts: string[];
}

export function ProfileForm({ sample }: { sample: Sample }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [posts, setPosts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillSample() {
    setName(sample.name);
    setHeadline(sample.headline);
    setAbout(sample.about);
    setPosts(sample.recent_posts.join("\n\n"));
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            name,
            headline,
            about,
            recent_posts: posts
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter(Boolean),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That could not be read.");
      router.push(`/drill/${data.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="headline" className="label mb-1.5 block text-muted">
          Their headline
        </label>
        <input
          id="headline"
          className="field"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="VP Operations at Harbourline Logistics"
          required
        />
      </div>

      <div>
        <label htmlFor="name" className="label mb-1.5 block text-muted">
          Their name <span className="font-normal normal-case tracking-normal">(only the initials are kept)</span>
        </label>
        <input
          id="name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rohan Mehta"
        />
      </div>

      <div>
        <label htmlFor="about" className="label mb-1.5 block text-muted">
          What they say about themselves
        </label>
        <textarea
          id="about"
          className="field min-h-24 resize-y"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Paste their about section."
        />
      </div>

      <div>
        <label htmlFor="posts" className="label mb-1.5 block text-muted">
          Things they have posted <span className="font-normal normal-case tracking-normal">(blank line between each)</span>
        </label>
        <textarea
          id="posts"
          className="field min-h-32 resize-y"
          value={posts}
          onChange={(e) => setPosts(e.target.value)}
          placeholder="Every vendor deck this quarter opened with an AI slide and closed without a price."
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={busy} className="btn btn-solid">
          {busy ? "Reading them" : "Read them"}
        </button>
        <button type="button" onClick={fillSample} className="btn btn-ghost">
          Use the sample profile
        </button>
      </div>

      {error ? <p className="text-[13px] text-text-2">{error}</p> : null}
    </form>
  );
}
