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
      <div className="border-2 border-rule bg-white px-5 py-4">
        <p className="display text-[18px] text-ink">
          {live ? "Calling you now. Pick up." : "One moment."}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {live
            ? "Stay on the line until they hang up. This page changes when the call ends."
            : "Playing a call that already happened."}
        </p>
      </div>
    );
  }

  if (live && armed) {
    return (
      <div className="border-2 border-rule bg-white px-5 py-4">
        <p className="text-[14px] text-ink">
          Your phone will ring on <span className="tnum font-medium">{destinationMasked}</span> in a
          few seconds. Be somewhere you can talk out loud.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={run} className="btn btn-mark">
            Ring my phone
          </button>
          <button type="button" onClick={() => setArmed(false)} className="btn btn-secondary">
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => (live ? setArmed(true) : run())} className="btn">
        {live ? "Call me now" : "Play a call that already happened"}
      </button>
      {error ? <p className="mt-3 text-[13px] text-no">{error}</p> : null}
    </div>
  );
}
