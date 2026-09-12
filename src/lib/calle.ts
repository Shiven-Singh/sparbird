/**
 * CALL-E wrapper.
 *
 * Two guarantees live here, and they are enforced before the API client is even built:
 *
 *   1. The only number this will dial is the caller's own: the phone saved on their account,
 *      or OWNER_E164 where that is set, which locks the whole install to one phone.
 *   2. Nothing dials at all unless SPARBIRD_LIVE is exactly "1".
 *
 * With the flag unset, every call in this module resolves from a recorded fixture, so the
 * whole app runs end to end with no key, no network, and no cost.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { compileTask, resultSchemaFor } from "./persona";
import { ConfigError, isE164, maskPhone, resolveDialNumber } from "./mask";
import type { CallSettings, DrillOutcome, PersonaSpec, TranscriptTurn } from "./types";

const FIXTURE_DIR = join(process.cwd(), "fixtures", "transcripts");

export class SelfDialViolation extends Error {
  constructor(attempted: string) {
    super(
      `Refused to place a call to ${maskPhone(attempted)}. Sparbird dials only the number on ` +
        "the caller's own account. This is a bug, not a configuration option.",
    );
    this.name = "SelfDialViolation";
  }
}

export class CallePlacementError extends Error {
  readonly cause?: unknown;
  /** CALL-E's own failure code, when it gave one: unsupported_region, insufficient_balance, ... */
  readonly code?: string;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CallePlacementError";
    this.cause = cause;
    this.code = codeOf(cause);
  }
}

/** What CALL-E actually said, dug out of whatever the SDK threw. */
function explain(cause: unknown): string {
  if (cause && typeof cause === "object") {
    const e = cause as { code?: unknown; message?: unknown; status?: unknown; name?: unknown };
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message) parts.push(e.message);
    const bracket: string[] = [];
    if (typeof e.code === "string" && e.code) bracket.push(e.code);
    if (typeof e.status === "number") bracket.push(`HTTP ${e.status}`);
    if (bracket.length) parts.push(`(${bracket.join(", ")})`);
    if (parts.length) return parts.join(" ");
    if (typeof e.name === "string" && e.name) return e.name;
  }
  return cause instanceof Error ? cause.message : String(cause);
}

function codeOf(cause: unknown): string | undefined {
  if (cause && typeof cause === "object") {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  return undefined;
}

/** Plain-words advice for the failures a person can actually do something about. */
const REMEDY: Record<string, string> = {
  account_concurrency_exceeded:
    "A CALL-E shared line runs one call at a time, and one is already running. Finish or cancel it " +
    "in the CALL-E dashboard, or wait for it to time out. A dedicated number raises the limit.",
  unsupported_region:
    "CALL-E will not dial that country. Check the number's country code against the regions your CALL-E account can reach.",
  insufficient_balance: "The CALL-E account is out of credit. Top it up and try again.",
  unauthorized: "CALL-E rejected the API key. Check CALLE_API_KEY.",
  forbidden: "This CALL-E account is not allowed to place this call.",
  rate_limit_exceeded: "CALL-E is rate limiting this account. Wait a moment and try again.",
  invalid_phone: "CALL-E could not read that number. It must be E.164: a plus, a country code, no spaces.",
  invalid_recipient: "CALL-E rejected the recipient. Check the number is one this account may call.",
  recipient_blocked: "That number is blocked at CALL-E's end.",
};

/**
 * Failures that will pass on their own. Worth separating: being told to wait a minute is a very
 * different instruction from being told your key is wrong, and they used to read the same.
 */
const TRANSIENT = new Set(["account_concurrency_exceeded", "rate_limit_exceeded", "provider_unavailable", "call_not_ready"]);

/** What the person who pressed the button should read. Exported so it can be tested offline. */
export function placementMessage(error: unknown): string {
  const code = codeOf(error);
  return [
    `CALL-E would not place the call: ${explain(error)}.`,
    code ? REMEDY[code] : undefined,
    code && TRANSIENT.has(code)
      ? "Nothing was dialled and nothing was charged. This one clears by itself, so try again shortly."
      : "Nothing has been scored. If the phone rang, the call still happened and may still be charged.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function isLive(): boolean {
  return process.env.SPARBIRD_LIVE === "1";
}

/** Which phone this install is locked to, if any. Set OWNER_E164 to lock it. */
export function lockedNumber(): string | null {
  return process.env.OWNER_E164?.trim() || null;
}

export interface LiveReadiness {
  /** True when pressing the button would actually make a phone ring. */
  ready: boolean;
  liveFlag: boolean;
  hasKey: boolean;
  /** The number that would ring, masked. Null when there is not a usable one. */
  numberMasked: string | null;
  /** Set when the install is pinned to one phone by OWNER_E164. */
  locked: boolean;
  /** What is missing, in the order it should be fixed. */
  missing: string[];
}

/**
 * Everything standing between a person and a ringing phone, answered in one place so the UI
 * can say which of them it is instead of failing at the moment they press the button.
 */
export function liveReadiness(accountPhone: string | null | undefined): LiveReadiness {
  const locked = lockedNumber();
  const number = locked ?? (accountPhone?.trim() || null);
  const usable = number !== null && isE164(number);
  const liveFlag = isLive();
  const hasKey = Boolean(process.env.CALLE_API_KEY?.trim());

  const missing: string[] = [];
  if (!usable) missing.push(number ? "phone-invalid" : "phone-missing");
  if (!hasKey) missing.push("key");
  if (!liveFlag) missing.push("flag");

  return {
    ready: missing.length === 0,
    liveFlag,
    hasKey,
    numberMasked: usable ? maskPhone(number!) : null,
    locked: locked !== null,
    missing,
  };
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
export function previewDrill(spec: PersonaSpec, dialTo?: string, settings?: CallSettings | null): DrillPreview {
  const owner = dialTo?.trim() || lockedNumber() || "";
  const task = owner ? compileTask(spec, owner, settings) : compileTask(spec, "{OWNER_E164 not set}", settings);
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

/** The provider's id for the last attempt, and a recording if one is ever returned. */
function attemptExtras(call: Record<string, unknown>): { providerCallId: string | null; recordingUrl: string | null } {
  const recipients = (call.recipients as Array<Record<string, unknown>> | undefined) ?? [];
  for (const recipient of recipients) {
    const attempts = (recipient.attempts as Array<Record<string, unknown>> | undefined) ?? [];
    for (let i = attempts.length - 1; i >= 0; i -= 1) {
      const attempt = attempts[i];
      if (!attempt) continue;
      const recording =
        (attempt.recordingUrl as string | undefined) ??
        (attempt.recording_url as string | undefined) ??
        null;
      const provider = (attempt.providerCallId as string | undefined) ?? null;
      if (provider || recording) return { providerCallId: provider, recordingUrl: recording };
    }
  }
  return { providerCallId: null, recordingUrl: null };
}

function normalise(call: Record<string, unknown>, personaId: string, live: boolean): DrillOutcome {
  const attemptFailure = firstAttemptFailure(call);
  const extras = attemptExtras(call);
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
    providerCallId: extras.providerCallId,
    recordingUrl: extras.recordingUrl,
  };
}

export interface RunDrillOptions {
  /** Which recorded call to replay when not live. Defaults to the first for this persona. */
  fixtureId?: string;
  /** Stable key so a retried request cannot become a second phone call. */
  idempotencyKey?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  /** How the caller should come at the trainee on this call. */
  settings?: CallSettings | null;
  /** The phone on the account placing this call. Ignored when OWNER_E164 locks the install. */
  accountPhone?: string | null;
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
  const settings = options.settings ?? undefined;

  if (!isLive()) {
    const replay = loadFixtureOutcome(spec, options.fixtureId);
    return settings ? { ...replay, settings } : replay;
  }

  const owner = resolveDialNumber(options.accountPhone);

  const apiKey = process.env.CALLE_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError(
      "SPARBIRD_LIVE=1 but CALLE_API_KEY is not set. Get a key from the CALL-E dashboard, " +
        "or unset SPARBIRD_LIVE to run from fixtures.",
    );
  }

  const task = compileTask(spec, owner, settings);

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
          tone: settings?.tone ?? "default",
          intent: settings?.intent ?? "default",
        },
      },
      {
        idempotencyKey: options.idempotencyKey,
        timeoutMs: options.timeoutMs ?? 15 * 60 * 1000,
        intervalMs: options.pollIntervalMs ?? 8000,
      },
    );

    const outcome = normalise(call as unknown as Record<string, unknown>, spec.id, true);
    return settings ? { ...outcome, settings } : outcome;
  } catch (error) {
    // The reason belongs where the person pressing the button can read it. Swallowing it
    // behind "something went wrong" is how you end up staring at a phone that never rings.
    console.error("[sparbird] live call failed", { code: codeOf(error), detail: explain(error) });
    throw new CallePlacementError(placementMessage(error), error);
  }
}
