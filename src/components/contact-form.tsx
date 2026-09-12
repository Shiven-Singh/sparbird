"use client";

import { useState } from "react";

export function ContactForm({ defaultEmail }: { defaultEmail?: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="panel panel-good p-6">
        <p className="text-[17px] leading-snug tracking-[-0.02em] text-text">
          That is with us. Someone will write back to you within a working day.
        </p>
        <button type="button" onClick={() => setSent(false)} className="btn btn-ghost mt-5">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="panel p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: form.get("email"), requirement: form.get("requirement") }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "That could not be sent.");
          setSent(true);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="email" className="label text-muted">
        Where to reply
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        defaultValue={defaultEmail}
        autoComplete="email"
        placeholder="you@company.com"
        className="field mt-2"
      />

      <label htmlFor="requirement" className="label mt-5 block text-muted">
        What you need
      </label>
      <textarea
        id="requirement"
        name="requirement"
        required
        rows={6}
        placeholder="Thirty new reps a quarter, most of whom have never been hung up on. We want them taking calls in week one."
        className="field mt-2 resize-y"
      />

      {error ? <p className="mt-3 text-[13px] text-bad">{error}</p> : null}

      <button type="submit" disabled={busy} className="btn btn-solid mt-5">
        {busy ? "Sending" : "Send this"}
      </button>
    </form>
  );
}
