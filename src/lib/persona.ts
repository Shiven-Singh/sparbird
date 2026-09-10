/**
 * Persona compiler.
 *
 * Turns a persona spec into the two things CALL-E needs: the task text the persona plays,
 * and the result schema it fills in afterwards. The disclosure line and the content
 * boundaries are added here and cannot be overridden by a persona file.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { PersonaSpec, RubricItem } from "./types";

/** Said first, verbatim, on every call Sparbird places. Not configurable. */
export const DISCLOSURE = "Heads up, this is a simulated practice persona, not a real person.";

/** Appended to every task. Not configurable. */
const BOUNDARIES = [
  "Never claim to be a real person, and never claim to be any specific named individual.",
  "Do not give medical, legal, or financial advice.",
  "Do not discuss any real third party by name.",
  "If asked directly whether you are an AI, say yes.",
];

const scriptedObjection = z.object({
  after_turn: z.number().int().min(0),
  text: z.string().min(1),
});

const rubricItem = z.object({
  id: z.string().min(1),
  weight: z.number().int().min(1),
  description: z.string().min(1),
  evidence: z.string().min(1),
});

const personaSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  source: z.enum(["archetype", "profile"]),
  audience: z.string().optional(),
  summary: z.string().optional(),
  reads: z
    .object({ engages_if: z.string().min(1), agrees_if: z.string().min(1) })
    .optional(),
  voice: z.object({
    locale: z.string().min(2),
    region: z.string().min(2),
    pace: z.string().min(1),
    patience: z.string().min(1),
  }),
  style: z.array(z.string().min(1)).min(1),
  hidden_state: z.object({
    engages_only_if: z.string().min(1),
    scripted_objections: z.array(scriptedObjection),
    concession: z.string().min(1),
  }),
  rubric: z.array(rubricItem).min(1),
  max_minutes: z.number().int().min(1).max(15),
});

const PERSONA_DIR = join(process.cwd(), "personas");

export function listPersonaIds(): string[] {
  return readdirSync(PERSONA_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

export function loadPersona(id: string): PersonaSpec {
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Persona id contains unexpected characters: ${id}`);
  }
  const raw = readFileSync(join(PERSONA_DIR, `${id}.json`), "utf8");
  const parsed = personaSchema.parse(JSON.parse(raw));
  if (parsed.id !== id) {
    throw new Error(`Persona file ${id}.json declares a different id: ${parsed.id}`);
  }
  return parsed;
}

export function loadAllPersonas(): PersonaSpec[] {
  return listPersonaIds().map(loadPersona);
}

/** Compiles the persona into the task text CALL-E runs. */
export function compileTask(spec: PersonaSpec, ownerE164: string): string {
  const objections = [...spec.hidden_state.scripted_objections].sort((a, b) => a.after_turn - b.after_turn);

  const objectionLines = objections.length
    ? objections
        .map((o) => `After the trainee's turn ${o.after_turn}, object with: "${o.text}"`)
        .join("\n")
    : "Raise whatever objection this person would naturally raise.";

  const reportFields = spec.rubric.map((item) => `- ${item.id}: ${item.description}`).join("\n");

  return [
    `Call the trainee at ${ownerE164}.`,
    "",
    `Open with this line, word for word, before anything else: "${DISCLOSURE}"`,
    "",
    `Then play this character for the rest of the call: ${spec.display_name}.`,
    spec.summary ? `In short: ${spec.summary}` : "",
    "",
    "Traits:",
    ...spec.style.map((s) => `- ${s}`),
    "",
    `Speak at a ${spec.voice.pace} pace with ${spec.voice.patience} patience.`,
    "",
    "Let the trainee lead. Do not coach them, do not break character to help, and do not fill their silences.",
    "",
    "Objections, in this order:",
    objectionLines,
    "",
    `You engage properly only if: ${spec.hidden_state.engages_only_if}`,
    `Commitment rule: ${spec.hidden_state.concession}`,
    "",
    ...BOUNDARIES,
    `End the call politely after ${spec.max_minutes} minutes, or sooner once you have made up your mind.`,
    "",
    "When the call is over, report what happened from your side of it:",
    "- objections_raised: the objections you actually raised, in your own words",
    "- rubric_observations: for each item below, answer yes, no, or unclear",
    reportFields,
    "- next_step_agreed: whether you agreed to a specific next step",
    "- strongest_moment and weakest_moment: one sentence each",
    "- persona_verdict: would_take_meeting, would_not, or undecided",
    "",
    "Answer from what was actually said on the call. If something did not happen, say it did not happen.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** The JSON Schema CALL-E fills in after the call, generated from the persona's rubric. */
export function resultSchemaFor(spec: PersonaSpec): Record<string, unknown> {
  const observations: Record<string, unknown> = {};
  for (const item of spec.rubric) {
    observations[item.id] = {
      type: "string",
      enum: ["yes", "no", "unclear"],
      description: item.description,
    };
  }

  return {
    type: "object",
    required: ["objections_raised", "rubric_observations", "next_step_agreed", "persona_verdict"],
    additionalProperties: false,
    properties: {
      objections_raised: {
        type: "array",
        items: { type: "string" },
        description: "The objections the persona actually raised.",
      },
      rubric_observations: {
        type: "object",
        required: spec.rubric.map((item) => item.id),
        additionalProperties: false,
        properties: observations,
      },
      next_step_agreed: {
        type: "string",
        enum: ["yes", "no", "unclear"],
        description: "Whether the persona agreed to a specific next step.",
      },
      strongest_moment: { type: "string" },
      weakest_moment: { type: "string" },
      persona_verdict: {
        type: "string",
        enum: ["would_take_meeting", "would_not", "undecided"],
      },
    },
  };
}

export function rubricById(spec: PersonaSpec, id: string): RubricItem | undefined {
  return spec.rubric.find((item) => item.id === id);
}

export function maxPoints(spec: PersonaSpec): number {
  return spec.rubric.reduce((total, item) => total + item.weight, 0);
}
