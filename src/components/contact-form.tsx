"use client";

import { useState } from "react";

export function ContactForm({ defaultEmail, defaultName }: { defaultEmail?: string; defaultName?: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="panel panel-good p-6">
        <p className="text-[17px] leading-snug tracking-[-0.02em] text-text">
          That is with us. Someone will write back to you within a working day.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          If it is urgent, say so in a second message and it will go to the top.
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
            body: JSON.stringify({
              name: form.get("name"),
              email: form.get("email"),
              company: form.get("company"),
              seats: form.get("seats"),
              message: form.get("message"),
            }),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label text-muted">
            Your name
          </label>
          <input id="name" name="name" required defaultValue={defaultName} autoComplete="name" className="field mt-2" />
        </div>
        <div>
          <label htmlFor="email" className="label text-muted">
            Where to reply
          </label>
          <input id="email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" className="field mt-2" />
        </div>
        <div>
          <label htmlFor="company" className="label text-muted">
            Company
          </label>
          <input id="company" name="company" autoComplete="organization" className="field mt-2" />
        </div>
        <div>
          <label htmlFor="seats" className="label text-muted">
            How many people
          </label>
          <input id="seats" name="seats" inputMode="numeric" placeholder="40" className="field mt-2" />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="label text-muted">
          What are you trying to do
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="We put thirty new reps through onboarding a quarter and most of them have never been hung up on."
          className="field mt-2 resize-y"
        />
      </div>

      {error ? <p className="mt-3 text-[13px] text-bad">{error}</p> : null}

      <button type="submit" disabled={busy} className="btn btn-solid mt-5">
        {busy ? "Sending" : "Send this"}
      </button>
    </form>
  );
}
