"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  personaId: string;
  live: boolean;
  destinationMasked: string;
}

export function TakeCall({ personaId, live, destinationMasked }: Props) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/drill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personaId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/attempt/${encodeURIComponent(data.attemptId)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
      setArmed(false);
    }
  }

  if (busy) {
    return (
      <div className="rounded-md border border-brass-dim bg-raised px-5 py-4">
        <p className="text-[15px] text-ink">
          {live ? "Calling you now. Pick up." : "Playing a call that already happened."}
        </p>
        <p className="mt-1 text-sm text-muted">
          {live
            ? "Stay on the line until they hang up. This page updates when the call ends."
            : "One moment."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {live && armed ? (
        <div className="rounded-md border border-dispute/40 bg-raised px-5 py-4">
          <p className="text-[15px] text-ink">
            Your phone will ring on {destinationMasked} in a few seconds.
          </p>
          <p className="mt-1 text-sm text-muted">
            Be somewhere you can talk out loud for a few minutes.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={run}
              className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-ground transition-opacity hover:opacity-90"
            >
              Ring my phone
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              className="rounded-sm border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:border-muted"
            >
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (live ? setArmed(true) : run())}
          className="rounded-sm bg-brass px-5 py-2.5 text-sm font-medium text-ground transition-opacity hover:opacity-90"
        >
          {live ? "Call me now" : "Play a call that already happened"}
        </button>
      )}

      {error ? <p className="mt-3 text-sm text-dispute">{error}</p> : null}
    </div>
  );
}
