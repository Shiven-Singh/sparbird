"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Profile {
  name?: string;
  headline?: string;
  about?: string;
  recent_posts?: string[];
}

/** A small CSV reader that copes with quoted fields, commas and line breaks inside them. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function profilesFromCsv(text: string): Profile[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col(["name"]);
  const iHeadline = col(["headline", "title", "role"]);
  const iAbout = col(["about", "bio", "summary"]);
  const iPosts = col(["posts", "recent_posts", "post"]);
  return rows.slice(1).map((r) => ({
    name: iName >= 0 ? r[iName]?.trim() : undefined,
    headline: iHeadline >= 0 ? r[iHeadline]?.trim() : undefined,
    about: iAbout >= 0 ? r[iAbout]?.trim() : undefined,
    recent_posts:
      iPosts >= 0 && r[iPosts]
        ? r[iPosts]!.split(/\s*\|\s*|\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        : [],
  }));
}

function profilesFromText(name: string, text: string): Profile[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return [{ headline: lines[0], about: lines.slice(1).join(" "), name: name.replace(/\.[^.]+$/, "") }];
}

export function AudienceUpload() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setError(null);
    setProfiles([]);
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const lower = file.name.toLowerCase();
    let found: Profile[] = [];
    try {
      if (lower.endsWith(".csv")) found = profilesFromCsv(text);
      else if (lower.endsWith(".json")) {
        const parsed = JSON.parse(text);
        found = Array.isArray(parsed) ? parsed : [parsed];
      } else found = profilesFromText(file.name, text);
    } catch {
      setError("That file could not be read.");
      return;
    }
    found = found.filter((p) => [p.headline, p.about, ...(p.recent_posts ?? [])].some((s) => s && s.trim()));
    if (found.length === 0) {
      setError("No one readable in that file. A CSV needs a headline column at least.");
      return;
    }
    setProfiles(found.slice(0, 50));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profiles }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That could not be read.");
      router.push(profiles.length === 1 ? `/drill/${data.id}` : "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="panel flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-dashed px-5 py-8 text-center transition-colors hover:bg-panel-2">
        <input
          type="file"
          accept=".csv,.json,.txt,.md,text/csv,application/json,text/plain"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="text-[14px] font-medium text-text">{fileName ?? "Choose a file"}</span>
        <span className="text-[13px] text-muted">
          A CSV with a row per person, a JSON list, or a plain text file for one person.
        </span>
      </label>

      <p className="text-[13px] leading-relaxed text-muted">
        CSV columns: <span className="text-text-2">name, headline, about, posts</span>. Separate several posts
        with a <span className="text-text-2">|</span>.{" "}
        <a href="/sample-audience.csv" className="text-text underline decoration-dotted underline-offset-4">
          Download the sample
        </a>{" "}
        to see the shape.
      </p>

      {profiles.length > 0 ? (
        <div className="panel rounded-lg">
          <p className="label border-b border-border-soft px-4 py-2.5 text-muted">
            {profiles.length} {profiles.length === 1 ? "person" : "people"} ready
          </p>
          <ul className="max-h-56 divide-y divide-border-soft overflow-y-auto px-4">
            {profiles.map((p, i) => (
              <li key={i} className="py-2 text-[13px]">
                <span className="text-text">{p.headline || "No headline"}</span>
                {p.name ? <span className="text-muted"> · {p.name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase()}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || profiles.length === 0} onClick={submit} className="btn btn-solid">
          {busy ? "Reading them" : profiles.length > 1 ? `Read all ${profiles.length}` : "Read them"}
        </button>
      </div>

      {error ? <p className="text-[13px] text-text-2">{error}</p> : null}
    </div>
  );
}
