"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  phone: string | null;
  /** True when OWNER_E164 pins this install to one phone and the field cannot change anything. */
  locked: boolean;
}

export function PhoneForm({ phone, locked }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(phone ?? "");
  const [confirmed, setConfirmed] = useState(Boolean(phone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: next, confirmed: next ? confirmed : true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That could not be saved.");
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(value.trim());
      }}
    >
      <label htmlFor="phone" className="label text-muted">
        Your phone
      </label>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-2">
        Write it the way a phone system reads it: a plus, your country code, then the number, with
        no spaces or dashes. A London mobile looks like +447700900123.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          disabled={locked}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="+14155550123"
          className="field tnum max-w-[260px] flex-1"
        />
        <button type="submit" disabled={locked || busy} className="btn btn-solid">
          {busy ? "Saving" : "Save"}
        </button>
        {phone && !locked ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setValue("");
              setConfirmed(false);
              void save("");
            }}
            className="btn btn-ghost"
          >
            Remove
          </button>
        ) : null}
      </div>

      {!locked ? (
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-text-2">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-[3px] size-4 shrink-0 accent-white"
          />
          This is my own phone and I am the person who will answer it.
        </label>
      ) : null}

      {error ? <p className="mt-3 text-[13px] text-bad">{error}</p> : null}
      {saved && !error ? <p className="mt-3 text-[13px] text-good">Saved.</p> : null}
    </form>
  );
}
