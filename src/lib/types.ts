/**
 * Shared types for Sparbird.
 *
 * Persona files on disk use snake_case: they are a data contract meant to be read and
 * hand-edited. Everything computed at runtime uses camelCase.
 */

export interface ScriptedObjection {
  /** Raise this objection after the trainee has taken this many turns. */
  after_turn: number;
  text: string;
}

export interface HiddenState {
  /** What the trainee must do before the persona engages properly. */
  engages_only_if: string;
  scripted_objections: ScriptedObjection[];
  /** What it takes to get a commitment out of this persona. */
  concession: string;
}

export interface RubricItem {
  id: string;
  /** Points this item is worth when the transcript proves it. */
  weight: number;
  description: string;
  /** What counts as proof, in plain words. */
  evidence: string;
}

export interface PersonaVoice {
  locale: string;
  region: string;
  pace: string;
  patience: string;
}

export interface PersonaSpec {
  id: string;
  display_name: string;
  source: "archetype" | "profile";
  audience?: string;
  summary?: string;
  voice: PersonaVoice;
  style: string[];
  hidden_state: HiddenState;
  rubric: RubricItem[];
  max_minutes: number;
}

export type Speaker = "bot" | "user" | "unknown";

/**
 * One line of a call. `bot` is the persona, `user` is the trainee.
 * Mirrors CALL-E's CallTranscriptTurn, which is snake_case inside the turn.
 */
export interface TranscriptTurn {
  offset_seconds: number | null;
  speaker: Speaker;
  text: string;
}

export interface CompletionConfidence {
  score: number;
  label: string;
}

/** A drill result, normalised so a fixture and a live call are the same shape. */
export interface DrillOutcome {
  callId: string;
  personaId: string;
  /** CALL-E lifecycle status: queued, in_progress, completed, failed, canceled. */
  status: string;
  /** True only when a real call was placed. */
  live: boolean;
  taskCompleted: boolean | null;
  completionConfidence: CompletionConfidence | null;
  structuredResult: Record<string, unknown> | null;
  evidence: string[];
  summary: string | null;
  transcript: TranscriptTurn[];
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: string;
}

export interface EvidenceSpan {
  /** Index into the transcript array. */
  turn: number;
  /** Text quoted verbatim from that turn. */
  quote: string;
}

export interface RubricVerdict {
  id: string;
  description: string;
  weight: number;
  met: boolean;
  span: EvidenceSpan | null;
  /** Why the item was not met, or could not be checked. */
  reason: string | null;
}

export interface Metrics {
  /** Share of spoken seconds attributable to the trainee, 0 to 1. */
  talkRatioTrainee: number | null;
  traineeTurns: number;
  traineeQuestions: number;
  /** Seconds from call start to the trainee's first figure. */
  secondsToFirstNumber: number | null;
  interruptsFaced: number;
  interruptsSurvived: number;
  callSeconds: number | null;
}

export interface Contradiction {
  field: string;
  claimed: string;
  reason: string;
}

export type Disposition = "scored" | "unscored";

export interface Scorecard {
  personaId: string;
  callId: string;
  live: boolean;
  disposition: Disposition;
  /** Set when disposition is "unscored". */
  unscoredReason: string | null;
  /** True when CALL-E's own structured result disagrees with the transcript. */
  disputed: boolean;
  contradictions: Contradiction[];
  points: number;
  maxPoints: number;
  itemsWithEvidence: number;
  itemsTotal: number;
  verdicts: RubricVerdict[];
  metrics: Metrics;
  /** Only carried through when the platform result was not disputed. */
  strongestMoment: string | null;
  weakestMoment: string | null;
  personaVerdict: string | null;
  judge: string;
}
