/**
 * CALL-E wrapper.
 *
 * Two guarantees live here, and they are enforced before the API client is even built:
 *
 *   1. The only number this will dial is OWNER_E164.
 *   2. Nothing dials at all unless SPARBIRD_LIVE is exactly "1".
 *
 * With the flag unset, every call in this module resolves from a recorded fixture, so the
 * whole app runs end to end with no key, no network, and no cost.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { compileTask, resultSchemaFor } from "./persona";
import { ConfigError, maskPhone, resolveOwnerNumber } from "./mask";
import type { DrillOutcome, PersonaSpec, TranscriptTurn } from "./types";

const FIXTURE_DIR = join(process.cwd(), "fixtures", "transcripts");

export class SelfDialViolation extends Error {
  constructor(attempted: string) {
    super(
      `Refused to place a call to ${maskPhone(attempted)}. Sparbird dials only OWNER_E164, ` +
        "the phone of the person running it. This is a bug, not a configuration option.",
    );
    this.name = "SelfDialViolation";
  }
}

export class CallePlacementError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CallePlacementError";
    this.cause = cause;
  }
}

export function isLive(): boolean {
  return process.env.SPARBIRD_LIVE === "1";
}

export interface DrillPreview {
  personaId: string;
  displayName: string;
  task: string;
  resultSchema: Record<string, unknown>;
  destinationMasked: string;
  live: boolean;
  maxMinutes: number;
}

/**
 * Everything that would be sent, with the destination masked. Building a preview never
 * dials and never needs an API key, so this is safe to render in a UI or print in a terminal.
 */
export function previewDrill(spec: PersonaSpec, ownerE164?: string): DrillPreview {
  const owner = ownerE164 ?? (process.env.OWNER_E164?.trim() || "");
  const task = owner ? compileTask(spec, owner) : compileTask(spec, "{OWNER_E164 not set}");
  return {
    personaId: spec.id,
    displayName: spec.display_name,
    task,
    resultSchema: resultSchemaFor(spec),
    destinationMasked: owner ? maskPhone(owner) : "not set",
    live: isLive(),
    maxMinutes: spec.max_minutes,
  };
}

interface FixtureFile {
  fixture_id: string;
  persona_id: string;
  note?: string;
  call: Record<string, unknown>;
}

function readFixtures(): FixtureFile[] {
  return readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8")) as FixtureFile);
}

export function listFixtures(personaId?: string): FixtureFile[] {
  const all = readFixtures();
  return personaId ? all.filter((f) => f.persona_id === personaId) : all;
}

/** Pulls the transcript out of a call payload, live or recorded. */
function extractTranscript(call: Record<string, unknown>): TranscriptTurn[] {
  const recipients = (call.recipients as Array<Record<string, unknown>> | undefined) ?? [];
  for (const recipient of recipients) {
    const attempts = (recipient.attempts as Array<Record<string, unknown>> | undefined) ?? [];
    for (let i = attempts.length - 1; i >= 0; i -= 1) {
      const turns = attempts[i]?.transcriptTurns as TranscriptTurn[] | undefined;
      if (turns && turns.length > 0) return turns;
    }
  }
  return [];
}

function firstAttemptFailure(call: Record<string, unknown>): { code: string | null; message: string | null } {
  const recipients = (call.recipients as Array<Record<string, unknown>> | undefined) ?? [];
  for (const recipient of recipients) {
    const attempts = (recipient.attempts as Array<Record<string, unknown>> | undefined) ?? [];
    for (const attempt of attempts) {
      if (attempt.failureCode) {
        return {
          code: (attempt.failureCode as string) ?? null,
          message: (attempt.failureMessage as string) ?? null,
        };
      }
    }
  }
  return { code: null, message: null };
}

function normalise(call: Record<string, unknown>, personaId: string, live: boolean): DrillOutcome {
  const attemptFailure = firstAttemptFailure(call);
  return {
    callId: (call.id as string) ?? "unknown",
    personaId,
    status: (call.status as string) ?? "unknown",
    live,
    taskCompleted: (call.taskCompleted as boolean | null) ?? null,
    completionConfidence:
      (call.completionConfidence as DrillOutcome["completionConfidence"]) ?? null,
    structuredResult: (call.structuredResult as Record<string, unknown> | null) ?? null,
    evidence: (call.evidence as string[] | undefined) ?? [],
    summary: (call.summary as string | null) ?? null,
    transcript: extractTranscript(call),
    failureCode: (call.failureCode as string | null) ?? attemptFailure.code,
    failureMessage: (call.failureMessage as string | null) ?? attemptFailure.message,
    startedAt: new Date().toISOString(),
  };
}

export interface RunDrillOptions {
  /** Which recorded call to replay when not live. Defaults to the first for this persona. */
  fixtureId?: string;
  /** Stable key so a retried request cannot become a second phone call. */
  idempotencyKey?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export function loadFixtureOutcome(spec: PersonaSpec, fixtureId?: string): DrillOutcome {
  const candidates = listFixtures(spec.id);
  if (candidates.length === 0) {
    throw new Error(
      `No recorded call for persona "${spec.id}". Add one under fixtures/transcripts/ so the ` +
        "dry run has something to replay, or set SPARBIRD_LIVE=1 to place a real call.",
    );
  }
  const chosen = fixtureId ? candidates.find((f) => f.fixture_id === fixtureId) : candidates[0];
  if (!chosen) {
    throw new Error(
      `No fixture "${fixtureId}" for persona "${spec.id}". Available: ${candidates
        .map((f) => f.fixture_id)
        .join(", ")}`,
    );
  }
  return normalise(chosen.call, spec.id, false);
}

/**
 * Runs one drill. Replays a fixture unless SPARBIRD_LIVE=1, in which case it places
 * exactly one call to OWNER_E164 and waits for the result.
 */
export async function runDrill(spec: PersonaSpec, options: RunDrillOptions = {}): Promise<DrillOutcome> {
  if (!isLive()) {
    return loadFixtureOutcome(spec, options.fixtureId);
  }

  const owner = resolveOwnerNumber();

  const apiKey = process.env.CALLE_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError(
      "SPARBIRD_LIVE=1 but CALLE_API_KEY is not set. Get a key from the CALL-E dashboard, " +
        "or unset SPARBIRD_LIVE to run from fixtures.",
    );
  }

  const task = compileTask(spec, owner);

  // The guard: the compiled task must address the owner's number and nothing else.
  if (!task.includes(owner)) {
    throw new SelfDialViolation("a number that is not OWNER_E164");
  }

  const { CalleClient } = await import("@call-e/calle");
  const client = new CalleClient({ apiKey });

  try {
    const call = await client.calls.createAndWait(
      {
        task,
        // Singular on purpose. There is no multi-recipient path in this app.
        recipient: {
          phone: owner,
          locale: spec.voice.locale,
          region: spec.voice.region,
        },
        resultSchema: resultSchemaFor(spec),
        metadata: {
          app: "sparbird",
          persona_id: spec.id,
          persona_source: spec.source,
        },
      },
      {
        idempotencyKey: options.idempotencyKey,
        timeoutMs: options.timeoutMs ?? 15 * 60 * 1000,
        intervalMs: options.pollIntervalMs ?? 8000,
      },
    );

    return normalise(call as unknown as Record<string, unknown>, spec.id, true);
  } catch (error) {
    throw new CallePlacementError(
      "CALL-E did not return a completed call. Nothing has been scored. " +
        "If the phone rang, the call still happened and may still be charged.",
      error,
    );
  }
}
