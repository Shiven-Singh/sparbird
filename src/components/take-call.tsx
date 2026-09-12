"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  personaId: string;
  live: boolean;
  destinationMasked: string;
  tone?: string;
  intent?: string;
  /**
   * What is standing between this person and a live call, when it is something they can fix
   * themselves. Anything they cannot fix, like the key or the live flag, is not their problem
   * to solve here and the recorded call runs instead.
   */
  needsNumber?: "signin" | "phone" | "locked" | null;
}

export function TakeCall({ personaId, live, destinationMasked, tone, intent, needsNumber }: Props) {
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
        body: JSON.stringify({ personaId, tone, intent }),
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
      <div className="panel px-5 py-4">
        <p className="text-[16px] font-medium tracking-[-0.03em] text-text">
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
      <div className="panel px-5 py-4">
        <p className="text-[14px] text-text">
          Your phone will ring on <span className="tnum font-medium">{destinationMasked}</span> in a
          few seconds. Be somewhere you can talk out loud.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={run} className="btn btn-solid">
            Ring my phone
          </button>
          <button type="button" onClick={() => setArmed(false)} className="btn btn-ghost">
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => (live ? setArmed(true) : run())}
        className="btn btn-solid h-[44px] w-full px-[18px] sm:w-auto"
      >
        {live ? "Call me now" : "Play a call that already happened"}
      </button>
      {!live && needsNumber ? (
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-text-2">
          {needsNumber === "locked" ? (
            <>
              This copy of Sparbird is set up to ring one particular phone, so it plays a recorded
              call for everyone else. It scores exactly the way a real one does.
            </>
          ) : needsNumber === "signin" ? (
            <>
              To be rung for real,{" "}
              <Link href="/signin" className="text-text underline decoration-dotted underline-offset-4">
                sign in
              </Link>{" "}
              and add your phone.
            </>
          ) : (
            <>
              To be rung for real, add your phone under{" "}
              <Link href="/settings" className="text-text underline decoration-dotted underline-offset-4">
                Settings
              </Link>
              .
            </>
          )}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-[13px] text-text-2">{error}</p> : null}
    </div>
  );
}
