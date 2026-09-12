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
import type { CallSettings, PersonaSpec, RubricItem } from "./types";

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
  track: z.enum(["founders", "sales", "hiring", "real-estate", "everyone"]).optional(),
  owner: z.string().nullable().optional(),
  audience: z.string().optional(),
  summary: z.string().optional(),
  /** Why this call is happening at all. Without it the caller has no scene to play. */
  premise: z.string().optional(),
  /** The first thing they say once they know someone is listening, in their own voice. */
  opening: z.string().optional(),
  reads: z
    .object({ engages_if: z.string().min(1), agrees_if: z.string().min(1) })
    .optional(),
  provenance: z
    .array(
      z.object({
        because: z.string().min(1),
        trait: z.string().min(1),
        objection: z.string().min(1),
      }),
    )
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

/** Whether a viewer may see this persona: the regulars are public, a built one belongs to its owner. */
export function canSee(spec: PersonaSpec, viewer: string | null): boolean {
  if (spec.source === "archetype") return true;
  if (!spec.owner) return true;
  return spec.owner === viewer;
}

export function loadAllPersonas(viewer: string | null = null): PersonaSpec[] {
  return listPersonaIds()
    .map(loadPersona)
    .filter((spec) => canSee(spec, viewer));
}

export const TRACKS: Record<string, { title: string; blurb: string }> = {
  founders: { title: "Raise money", blurb: "You pitch the investor before you pitch the investor." },
  sales: { title: "Sell", blurb: "The buyer has heard this pitch before, and probably last week." },
  hiring: { title: "Get hired", blurb: "You take the phone screen the night before the phone screen." },
  "real-estate": { title: "Win the listing", blurb: "The seller just fired an agent and is not convinced you are different." },
  everyone: { title: "Say the hard thing", blurb: "You say the thing you have been putting off, to the person who does not want to hear it." },
};

/** How the caller comes at you. "default" means as the persona is written. */
export const TONES: Record<string, { label: string; brief: string }> = {
  default: { label: "As written", brief: "" },
  warm: { label: "Warm", brief: "warm and easy to talk to, but hands you nothing you have not earned" },
  neutral: { label: "Neutral", brief: "level and businesslike, neither friendly nor cold" },
  blunt: { label: "Blunt", brief: "blunt; says exactly what they think with no cushioning" },
  hostile: { label: "Hostile", brief: "short-tempered and openly doubtful of you from the first line" },
};

export const INTENTS: Record<string, { label: string; brief: string }> = {
  default: { label: "As written", brief: "" },
  curious: { label: "Curious", brief: "genuinely curious and open to being convinced" },
  skeptical: { label: "Skeptical", brief: "skeptical; assumes the pitch is oversold until shown otherwise" },
  fence: { label: "On the fence", brief: "on the fence; has a real need but is weighing an alternative" },
  no: { label: "Wants to say no", brief: "looking for a reason to say no and end the call early" },
};

export function isToneKey(value: unknown): value is keyof typeof TONES {
  return typeof value === "string" && value in TONES;
}

export function isIntentKey(value: unknown): value is keyof typeof INTENTS {
  return typeof value === "string" && value in INTENTS;
}

/** The settings a call was made with, in a sentence for a human. */
export function describeSettings(settings: CallSettings | undefined | null): string | null {
  if (!settings) return null;
  const parts: string[] = [];
  if (settings.tone !== "default" && TONES[settings.tone]) parts.push(TONES[settings.tone]!.brief);
  if (settings.intent !== "default" && INTENTS[settings.intent]) parts.push(INTENTS[settings.intent]!.brief);
  if (parts.length === 0) return null;
  return `They were ${parts.join(", and ")}.`;
}

/** Compiles the persona into the task text CALL-E runs. */
export function compileTask(spec: PersonaSpec, ownerE164: string, settings?: CallSettings | null): string {
  const objections = [...spec.hidden_state.scripted_objections].sort((a, b) => a.after_turn - b.after_turn);

  const toneLine =
    settings && settings.tone !== "default" && TONES[settings.tone]
      ? `Tone for this call: ${TONES[settings.tone]!.brief}.`
      : "";
  const intentLine =
    settings && settings.intent !== "default" && INTENTS[settings.intent]
      ? `Going in, you are ${INTENTS[settings.intent]!.brief}.`
      : "";

  const objectionLines = objections.length
    ? objections
        .map((o) => `Not before their turn ${o.after_turn}: "${o.text}"`)
        .join("\n")
    : "Raise whatever objection this person would naturally raise.";

  const reportFields = spec.rubric.map((item) => `- ${item.id}: ${item.description}`).join("\n");

  return [
    `Call the trainee at ${ownerE164}.`,
    "",
    // The line used to go out the moment the call was placed, which meant it was delivered to a
    // ringing phone and heard by nobody. A disclosure nobody hears is not a disclosure.
    "Say nothing at all until they speak first. They are answering a ringing phone and will say",
    "hello or give their name. Wait for that, however long it takes.",
    "",
    `Then, before anything else, say this line word for word: "${DISCLOSURE}"`,
    "",
    "If they go quiet early on, or say they cannot hear you, say that line again and wait. A bad",
    "connection at the start is not them being difficult, and the character does not begin until",
    "you know they can hear you.",
    "",
    `Then play this character for the rest of the call: ${spec.display_name}.`,
    spec.summary ? `In short: ${spec.summary}` : "",
    spec.premise ? `Why you are on this call: ${spec.premise}` : "",
    spec.opening
      ? `Your first line in character is this, or something close to it in your own words: "${spec.opening}"`
      : "",
    "",
    "You are this person for the whole call. Never narrate, never coach, and never tell them what to",
    "do next. Lines like \"go ahead and make your pitch\" are a stage direction, not something anyone",
    "says on a real phone call. Say what this person would say.",
    "",
    "Traits:",
    ...spec.style.map((s) => `- ${s}`),
    "",
    `Speak at a ${spec.voice.pace} pace with ${spec.voice.patience} patience.`,
    toneLine,
    intentLine,
    "",
    "Listen to what the trainee actually says and respond to it in your own words. Push back on the specific",
    "claim they just made, not on a script. If they answer an objection well, move on to the next thing you",
    "would really care about; if they dodge it, come back to it.",
    "",
    "Let the trainee lead. Do not coach them, do not break character to help, and do not fill their silences.",
    "",
    "Objections you have to get to, in this order. These are not a schedule. Raise each one when it",
    "actually fits what they have just said, and never earlier than the turn given.",
    objectionLines,
    "",
    "If they have not yet told you what the thing even is, ask them that before anything else. An",
    "objection to something you have not heard described is not an objection, it is a non sequitur.",
    "A bare number with no company attached earns \"a million dollars for what?\", not your next",
    "scripted line.",
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
