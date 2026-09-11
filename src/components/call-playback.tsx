"use client";

import { useEffect, useRef, useState } from "react";
import type { TranscriptTurn } from "@/lib/types";

interface Props {
  transcript: TranscriptTurn[];
  recordingUrl: string | null;
  providerCallId: string | null;
  live: boolean;
}

function timecode(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * Playing a call back.
 *
 * When there is audio, this is a player and the transcript follows it. CALL-E does not return a
 * recording today, so the usual case is the second one: the call replays against its own
 * timestamps, one line at a time, at the pace it actually happened. No audio is invented.
 */
export function CallPlayback({ transcript, recordingUrl, providerCallId, live }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const lastOffset = [...transcript].reverse().find((t) => t.offset_seconds !== null)?.offset_seconds ?? 0;
  const total = lastOffset + 5;

  // The replay clock, used only when there is no audio to follow.
  useEffect(() => {
    if (!playing || recordingUrl) return;
    const startedAt = performance.now() - elapsed * 1000;
    let frame = 0;
    const tick = () => {
      const now = (performance.now() - startedAt) / 1000;
      if (now >= total) {
        setElapsed(total);
        setPlaying(false);
        return;
      }
      setElapsed(now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // elapsed is the seed for the clock, not a dependency; restarting on it would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, recordingUrl, total]);

  // Scroll the line being spoken into view.
  const currentIndex = transcript.reduce(
    (at, turn, i) => ((turn.offset_seconds ?? 0) <= elapsed ? i : at),
    -1,
  );
  useEffect(() => {
    if (!playing || currentIndex < 0) return;
    document.getElementById(`turn-${currentIndex}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentIndex, playing]);

  // Tell the transcript which line is live, so it can light up without prop drilling.
  useEffect(() => {
    for (const el of document.querySelectorAll("[data-turn]")) {
      el.classList.toggle("is-speaking", playing && Number(el.getAttribute("data-turn")) === currentIndex);
    }
  }, [currentIndex, playing]);

  function toggle() {
    if (recordingUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) audio.pause();
      else void audio.play();
      return;
    }
    if (elapsed >= total) setElapsed(0);
    setPlaying((was) => !was);
  }

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label text-muted">{recordingUrl ? "The recording" : "Play it back"}</p>
          <p className="mt-1.5 text-[14px] text-text-2">
            {recordingUrl
              ? "The audio, with the transcript following along."
              : "No audio for this call, so it replays against its own timestamps, at the pace it happened."}
          </p>
        </div>
        <button type="button" onClick={toggle} className="btn btn-solid">
          {playing ? "Pause" : elapsed > 0 && elapsed < total ? "Resume" : recordingUrl ? "Play the recording" : "Play the call"}
        </button>
      </div>

      {recordingUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={recordingUrl}
          preload="none"
          className="mt-4 w-full"
          controls
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        />
      ) : (
        <div className="mt-4">
          <div className="h-[3px] w-full bg-panel-2">
            <div
              className="h-full bg-text transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between">
            <span className="tnum text-[12px] text-muted">{timecode(elapsed)}</span>
            <span className="tnum text-[12px] text-faint">{timecode(total)}</span>
          </div>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        {live
          ? "The call service returns the transcript and its own call id, not the audio. "
          : "This is a recorded sample call. "}
        {providerCallId ? (
          <>
            Find it in the CALL-E dashboard under <span className="tnum text-muted">{providerCallId}</span>.
          </>
        ) : null}
      </p>
    </div>
  );
}
