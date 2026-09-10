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
      <div className="border-2 border-rule p-6">
        <p className="display text-[28px] text-ink">
          {live ? "Calling you now. Pick up." : "One moment."}
        </p>
        <p className="mt-2 text-sm text-muted">
          {live
            ? "Stay on the line until they hang up. This page changes when the call ends."
            : "Playing a call that already happened."}
        </p>
      </div>
    );
  }

  if (live && armed) {
    return (
      <div className="border-2 border-rule p-6">
        <p className="text-[15px] text-ink">
          Your phone will ring on <span className="tnum">{destinationMasked}</span> in a few seconds.
          Be somewhere you can talk out loud.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={run}
            className="label bg-mark px-6 py-4 text-ink transition-opacity hover:opacity-85"
          >
            Ring my phone
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="label border-2 border-rule px-6 py-4 text-ink transition-colors hover:bg-paper-2"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => (live ? setArmed(true) : run())}
        className="label bg-ink px-7 py-5 text-paper transition-opacity hover:opacity-85"
      >
        {live ? "Call me now" : "Play a call that already happened"}
      </button>
      {error ? <p className="mt-3 text-sm text-no">{error}</p> : null}
    </div>
  );
}
