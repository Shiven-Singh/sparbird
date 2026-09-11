/**
 * Scoring.
 *
 * Two layers. The first is arithmetic on the transcript's own timestamps and cannot be
 * argued with. The second is the rubric, where an item scores only if a judge can quote the
 * turn that proves it.
 *
 * The transcript is the ground truth. CALL-E's structured result is treated as a claim about
 * the call, checked against the transcript, and dropped when the two disagree.
 */

import { containsNumber, objectionTurns, type RubricJudge } from "./judge";
import { maxPoints } from "./persona";
import type {
  Contradiction,
  DrillOutcome,
  Metrics,
  PersonaSpec,
  RubricItem,
  Scorecard,
  TranscriptTurn,
} from "./types";

const INTERROGATIVE = /^(what|why|how|when|where|who|which|do|does|did|can|could|would|will|are|is|have|has)\b/i;

const REFUSAL = /\b(not going to|won't take|will not take|we are done|we're done|good luck|come back when|i'll pass|i will pass|not interested)\b/i;

const AGREEMENT = /\b(send me|send it|i will take|i'll take|second call|next week|book|schedule|set something up|follow up|follow-up)\b/i;

/** A turn lasts until the next one starts. The last turn gets a nominal four seconds. */
function turnDurations(transcript: TranscriptTurn[]): number[] {
  return transcript.map((turn, i) => {
    const start = turn.offset_seconds;
    const next = transcript[i + 1]?.offset_seconds;
    if (start === null || start === undefined) return 0;
    if (next === null || next === undefined) return 4;
    return Math.max(0, next - start);
  });
}

export function computeMetrics(transcript: TranscriptTurn[]): Metrics {
  const durations = turnDurations(transcript);
  const total = durations.reduce((a, b) => a + b, 0);
  const traineeSeconds = durations.reduce(
    (sum, d, i) => (transcript[i]?.speaker === "user" ? sum + d : sum),
    0,
  );

  const trainee = transcript.filter((t) => t.speaker === "user");
  const questions = trainee.filter(
    (t) => t.text.includes("?") || INTERROGATIVE.test(t.text.trim()),
  ).length;

  const firstNumberTurn = transcript.find((t) => t.speaker === "user" && containsNumber(t.text));

  const objections = objectionTurns(transcript);
  let survived = 0;
  for (const objection of objections) {
    const after = transcript.findIndex(
      (t, i) => i > objection.turn && t.speaker === "user",
    );
    if (after !== -1 && containsNumber(transcript[after]!.text)) survived += 1;
  }

  const lastOffset = [...transcript].reverse().find((t) => t.offset_seconds !== null)?.offset_seconds;

  return {
    talkRatioTrainee: total > 0 ? Number((traineeSeconds / total).toFixed(2)) : null,
    traineeTurns: trainee.length,
    traineeQuestions: questions,
    secondsToFirstNumber: firstNumberTurn?.offset_seconds ?? null,
    interruptsFaced: objections.length,
    interruptsSurvived: survived,
    callSeconds: lastOffset ?? null,
  };
}

function isNumberItem(item: RubricItem): boolean {
  return /figure|number|measured|quantif|outcome|cost|price/i.test(
    `${item.evidence} ${item.description}`,
  );
}

/**
 * Checks the platform's own result against the transcript. Only reports a contradiction
 * where the transcript positively shows the opposite, never on absence alone.
 */
export function detectContradictions(
  spec: PersonaSpec,
  outcome: DrillOutcome,
): Contradiction[] {
  const result = outcome.structuredResult;
  const transcript = outcome.transcript;
  if (!result || transcript.length === 0) return [];

  const found: Contradiction[] = [];
  const personaText = transcript.filter((t) => t.speaker === "bot").map((t) => t.text);
  const traineeText = transcript.filter((t) => t.speaker === "user").map((t) => t.text);

  if (result.next_step_agreed === "yes") {
    const refused = personaText.some((t) => REFUSAL.test(t));
    const agreed = personaText.some((t) => AGREEMENT.test(t) && !REFUSAL.test(t));
    if (refused && !agreed) {
      found.push({
        field: "next_step_agreed",
        claimed: "yes",
        reason: "The persona refused on the call. No turn contains an agreement to a next step.",
      });
    }
  }

  const observations = result.rubric_observations as Record<string, string> | undefined;
  if (observations) {
    const anyNumber = traineeText.some((t) => containsNumber(t));
    for (const item of spec.rubric) {
      if (observations[item.id] === "yes" && isNumberItem(item) && !anyNumber) {
        found.push({
          field: `rubric_observations.${item.id}`,
          claimed: "yes",
          reason: "No trainee turn in the transcript contains a figure of any kind.",
        });
      }
    }
  }

  return found;
}

function unscored(spec: PersonaSpec, outcome: DrillOutcome, reason: string, judge: string): Scorecard {
  return {
    personaId: spec.id,
    callId: outcome.callId,
    live: outcome.live,
    disposition: "unscored",
    unscoredReason: reason,
    disputed: false,
    contradictions: [],
    points: 0,
    maxPoints: maxPoints(spec),
    itemsWithEvidence: 0,
    itemsTotal: spec.rubric.length,
    verdicts: [],
    metrics: computeMetrics(outcome.transcript),
    strongestMoment: null,
    weakestMoment: null,
    personaVerdict: null,
    judge,
    settings: outcome.settings,
  };
}

export async function scoreDrill(
  spec: PersonaSpec,
  outcome: DrillOutcome,
  judge: RubricJudge,
): Promise<Scorecard> {
  // Fail closed. A call that did not complete says nothing about how the trainee did.
  if (outcome.status !== "completed") {
    const detail = outcome.failureCode
      ? `CALL-E reported ${outcome.status} (${outcome.failureCode}).`
      : `CALL-E reported ${outcome.status}.`;
    return unscored(
      spec,
      outcome,
      `${detail} A call that did not complete is not a bad pitch, so nothing was scored.`,
      judge.name,
    );
  }

  if (outcome.transcript.length === 0) {
    return unscored(
      spec,
      outcome,
      "The call completed but returned no transcript, so there is no evidence to score against.",
      judge.name,
    );
  }

  const verdicts = await judge.judge({ transcript: outcome.transcript, rubric: spec.rubric });
  const proven = verdicts.filter((v) => v.met && v.span !== null);
  const contradictions = detectContradictions(spec, outcome);
  const disputed = contradictions.length > 0;
  const result = outcome.structuredResult ?? {};
  const metrics = computeMetrics(outcome.transcript);
  const review = await judge.review({
    transcript: outcome.transcript,
    rubric: spec.rubric,
    verdicts,
    metrics,
  });

  return {
    personaId: spec.id,
    callId: outcome.callId,
    live: outcome.live,
    disposition: "scored",
    unscoredReason: null,
    disputed,
    contradictions,
    points: proven.reduce((sum, v) => sum + v.weight, 0),
    maxPoints: maxPoints(spec),
    itemsWithEvidence: proven.length,
    itemsTotal: spec.rubric.length,
    verdicts,
    metrics,
    // The persona's own narrative is only repeated when its result was not contradicted.
    strongestMoment: disputed ? null : ((result.strongest_moment as string) ?? null),
    weakestMoment: disputed ? null : ((result.weakest_moment as string) ?? null),
    personaVerdict: disputed ? null : ((result.persona_verdict as string) ?? null),
    judge: judge.name,
    review,
    settings: outcome.settings,
  };
}

/** One line that never states a score without the denominator behind it. */
export function headline(card: Scorecard): string {
  if (card.disposition === "unscored") return `Unscored. ${card.unscoredReason ?? ""}`.trim();
  const base = `${card.itemsWithEvidence} of ${card.itemsTotal} rubric items with evidence, ${card.points} of ${card.maxPoints} points`;
  return card.disputed ? `${base}. Platform result disputed and set aside.` : base;
}
