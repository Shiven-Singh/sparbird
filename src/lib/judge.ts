/**
 * Rubric judges.
 *
 * A judge decides whether the transcript proves a rubric item. The rule every judge obeys:
 * an item is met only when the judge can point at the turn that proves it and quote it
 * verbatim. A quote that does not appear in the transcript is thrown away and the item is
 * recorded as unproven, so a confident-sounding judge cannot invent evidence.
 *
 * The default judge is a deterministic stub: no network, no key, no cost. It is honest about
 * what it cannot check. Set JUDGE_PROVIDER=anthropic with a key for the model judge.
 */

import type { EvidenceSpan, RubricItem, RubricVerdict, TranscriptTurn } from "./types";

export interface JudgeInput {
  transcript: TranscriptTurn[];
  rubric: RubricItem[];
}

export interface RubricJudge {
  readonly name: string;
  judge(input: JudgeInput): Promise<RubricVerdict[]>;
}

const NUMBER_WORDS =
  /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|per cent)\b/i;

/** Matches the figure itself, so a quote can be cut around it. Kept word-bounded on both
 *  sides so "one" does not match inside "onerous". */
const NUMERIC =
  /\d+|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|per cent)\b/i;

const COST_WORDS = /\b(cost|costs|cents|dollars|rupees|price|priced|margin|spend)\b/i;

/** Marks a figure as being about one unit rather than a total. */
const PER_UNIT = /\b(per|each|unit|invoice|apiece|a piece)\b/i;

const AGREEMENT = /\b(send me|send it|i will take|i'll take|second call|next week|book|schedule|set something up|follow up|follow-up|come back to me|let's talk)\b/i;

const REFUSAL = /\b(not going to|won't take|will not take|no thanks|we are done|we're done|good luck|come back when|i'll pass|i will pass|not interested|stop you there)\b/i;

const FIRST_PERSON_DECISION = /\b(i decided|i chose|i made the call|i owned|i pushed|i argued|my call|i cut|i shipped)\b/i;

const FAILURE_WORDS = /\b(did not work|didn't work|failed|we lost|mistake|got it wrong|fell over|missed)\b/i;

const STOPWORDS = new Set([
  "about", "after", "again", "against", "because", "before", "being", "between", "could",
  "every", "first", "there", "these", "thing", "think", "those", "through", "under", "where",
  "which", "while", "would", "their", "they", "that", "this", "with", "have", "from", "were",
  "what", "when", "your", "yeah", "really", "going", "right", "still", "thanks",
]);

export function containsNumber(text: string): boolean {
  return /\d/.test(text) || NUMBER_WORDS.test(text);
}

/** The sentence containing the match, so the quote is verbatim by construction. */
function quoteAround(text: string, pattern: RegExp): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const hit = sentences.find((s) => pattern.test(s));
  const chosen = hit ?? sentences[0] ?? text;
  return chosen.trim().slice(0, 220);
}

function stems(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 6)),
  );
}

interface Indexed {
  turn: number;
  text: string;
}

/** A turn that proves something, plus the pattern that proved it, so the quote can be cut
 *  around the actual evidence instead of the first sentence in the turn. */
interface Hit extends Indexed {
  pattern: RegExp;
}

function traineeTurns(transcript: TranscriptTurn[]): Indexed[] {
  return transcript
    .map((t, i) => ({ turn: i, text: t.text, speaker: t.speaker }))
    .filter((t) => t.speaker === "user")
    .map(({ turn, text }) => ({ turn, text }));
}

function personaTurns(transcript: TranscriptTurn[]): Indexed[] {
  return transcript
    .map((t, i) => ({ turn: i, text: t.text, speaker: t.speaker }))
    .filter((t) => t.speaker === "bot")
    .map(({ turn, text }) => ({ turn, text }));
}

/** Persona turns that read as a challenge rather than a pleasantry. */
export function objectionTurns(transcript: TranscriptTurn[]): Indexed[] {
  return personaTurns(transcript).filter(
    (t) => /\?/.test(t.text) || /\bthat is not an answer|give me a number\b/i.test(t.text),
  );
}

function findAgreement(transcript: TranscriptTurn[]): Hit | null {
  for (const turn of personaTurns(transcript)) {
    if (REFUSAL.test(turn.text)) continue;
    if (AGREEMENT.test(turn.text)) return { ...turn, pattern: AGREEMENT };
  }
  return null;
}

function findFirstNumber(turns: Indexed[], alsoRequire?: RegExp): Hit | null {
  for (const turn of turns) {
    if (!containsNumber(turn.text)) continue;
    if (alsoRequire && !alsoRequire.test(turn.text)) continue;
    return { ...turn, pattern: NUMERIC };
  }
  return null;
}

/**
 * A cost figure about one unit, not a total. Prefers a turn that says "per", "each",
 * "unit" or "invoice", and only falls back to any cost figure when there is no such turn.
 */
function findUnitCost(transcript: TranscriptTurn[]): Hit | null {
  const turns = traineeTurns(transcript);
  const perUnit = turns.find(
    (t) => containsNumber(t.text) && COST_WORDS.test(t.text) && PER_UNIT.test(t.text),
  );
  if (perUnit) return { ...perUnit, pattern: COST_WORDS };
  return findFirstNumber(turns, COST_WORDS);
}

/** Did the trainee return to their point after being cut off? */
function findSurvivedInterrupt(transcript: TranscriptTurn[]): Hit | null {
  const objections = objectionTurns(transcript);
  for (const objection of objections) {
    const before = traineeTurns(transcript).filter((t) => t.turn < objection.turn).pop();
    const after = traineeTurns(transcript).find((t) => t.turn > objection.turn);
    if (!after) continue;
    if (containsNumber(after.text)) return { ...after, pattern: NUMERIC };
    if (!before) continue;
    const shared = [...stems(before.text)].filter((s) => stems(after.text).has(s));
    if (shared.length >= 1) return { ...after, pattern: new RegExp(shared[0]!, "i") };
  }
  return null;
}

type Check = (transcript: TranscriptTurn[]) => Hit | null;

/** Picks a check for a rubric item from the plain-words evidence description. */
function checkFor(item: RubricItem): Check | null {
  const e = `${item.evidence} ${item.description}`.toLowerCase();

  if (/agree|follow-up|follow up|next step/.test(e)) {
    return (t) => findAgreement(t);
  }
  if (/cut off|interrupt|same claim/.test(e)) {
    return (t) => findSurvivedInterrupt(t);
  }
  if (/cost|per-unit|per unit|price/.test(e)) {
    return (t) => findUnitCost(t);
  }
  if (/figure|number|measured|quantif|outcome/.test(e)) {
    return (t) => findFirstNumber(traineeTurns(t));
  }
  if (/first-person|personally|decision|choice/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => FIRST_PERSON_DECISION.test(x.text));
      return hit ? { ...hit, pattern: FIRST_PERSON_DECISION } : null;
    };
  }
  if (/failure|did not work|honest/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => FAILURE_WORDS.test(x.text));
      return hit ? { ...hit, pattern: FAILURE_WORDS } : null;
    };
  }
  return null;
}

export class StubJudge implements RubricJudge {
  readonly name = "stub";

  async judge({ transcript, rubric }: JudgeInput): Promise<RubricVerdict[]> {
    return rubric.map((item) => {
      const check = checkFor(item);
      if (!check) {
        return {
          id: item.id,
          description: item.description,
          weight: item.weight,
          met: false,
          span: null,
          reason:
            "The offline judge has no check for this item. Set JUDGE_PROVIDER=anthropic with a key to have it read.",
        };
      }
      const hit = check(transcript);
      if (!hit) {
        return {
          id: item.id,
          description: item.description,
          weight: item.weight,
          met: false,
          span: null,
          reason: `Nothing in the transcript shows ${item.evidence}.`,
        };
      }
      return {
        id: item.id,
        description: item.description,
        weight: item.weight,
        met: true,
        span: { turn: hit.turn, quote: quoteAround(hit.text, hit.pattern) },
        reason: null,
      };
    });
  }
}

/** Discards any quote the transcript does not actually contain. */
export function verifySpan(
  transcript: TranscriptTurn[],
  span: EvidenceSpan | null,
): { span: EvidenceSpan | null; reason: string | null } {
  if (!span) return { span: null, reason: "No evidence offered." };
  const turn = transcript[span.turn];
  if (!turn) return { span: null, reason: "Evidence pointed at a turn that does not exist." };
  const quote = span.quote.trim();
  if (quote.length === 0) return { span: null, reason: "Evidence quote was empty." };
  if (!turn.text.includes(quote)) {
    return { span: null, reason: "Evidence quote does not appear in that turn." };
  }
  return { span: { turn: span.turn, quote }, reason: null };
}

class ModelJudge implements RubricJudge {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.name = `model:${model}`;
  }

  async judge({ transcript, rubric }: JudgeInput): Promise<RubricVerdict[]> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: this.apiKey });

    const numbered = transcript
      .map((t, i) => `[${i}] ${t.speaker === "user" ? "TRAINEE" : "PERSONA"}: ${t.text}`)
      .join("\n");

    const items = rubric
      .map((item) => `- id: ${item.id}\n  asks: ${item.description}\n  proof required: ${item.evidence}`)
      .join("\n");

    const prompt = [
      "You are grading one practice sales or pitch call from its transcript.",
      "TRAINEE is the person being graded. PERSONA is the simulated counterpart.",
      "",
      "Transcript:",
      numbered,
      "",
      "Rubric items:",
      items,
      "",
      'For each item return {"id": string, "met": boolean, "turn": number|null, "quote": string|null, "reason": string|null}.',
      "The quote MUST be copied character for character from the turn you name. Never paraphrase.",
      "If no turn proves the item, set met false and quote null. Do not guess.",
      'Return only a JSON array, no prose.',
    ].join("\n");

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("")
      .trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    let parsed: Array<Record<string, unknown>> = [];
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      } catch {
        parsed = [];
      }
    }

    return rubric.map((item) => {
      const raw = parsed.find((p) => p.id === item.id);
      if (!raw || raw.met !== true) {
        return {
          id: item.id,
          description: item.description,
          weight: item.weight,
          met: false,
          span: null,
          reason: (raw?.reason as string) ?? "The judge found nothing that proves this item.",
        };
      }
      const claimed =
        typeof raw.turn === "number" && typeof raw.quote === "string"
          ? { turn: raw.turn, quote: raw.quote }
          : null;
      const { span, reason } = verifySpan(transcript, claimed);
      return {
        id: item.id,
        description: item.description,
        weight: item.weight,
        met: span !== null,
        span,
        reason: span ? null : reason,
      };
    });
  }
}

export function createJudge(): RubricJudge {
  const provider = (process.env.JUDGE_PROVIDER ?? "stub").trim().toLowerCase();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (provider === "stub" || !apiKey) return new StubJudge();
  return new ModelJudge(apiKey, process.env.JUDGE_MODEL?.trim() || "claude-sonnet-5");
}
