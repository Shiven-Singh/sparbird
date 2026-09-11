/**
 * Rubric judges and call reviewers.
 *
 * A judge decides whether the transcript proves a rubric item, and then reads the whole call
 * for what worked, what hurt, and what should be looked at again: a promise made on the line,
 * an absolute that cannot be backed, pressure, running down the alternative.
 *
 * The rule every judge obeys: a point is made only when the judge can point at the turn that
 * proves it and quote it verbatim. A quote that does not appear in the transcript is thrown away,
 * so a confident-sounding judge cannot invent evidence.
 *
 * The default judge is deterministic: no network, no key, no cost. It is honest about what it
 * cannot check. Set JUDGE_PROVIDER=anthropic with a key for the model judge.
 */

import type {
  EvidenceSpan,
  FlagKind,
  Metrics,
  Review,
  ReviewFlag,
  ReviewPoint,
  RubricItem,
  RubricVerdict,
  TranscriptTurn,
} from "./types";

export interface JudgeInput {
  transcript: TranscriptTurn[];
  rubric: RubricItem[];
}

export interface ReviewInput extends JudgeInput {
  verdicts: RubricVerdict[];
  metrics: Metrics;
}

export interface RubricJudge {
  readonly name: string;
  judge(input: JudgeInput): Promise<RubricVerdict[]>;
  review(input: ReviewInput): Promise<Review>;
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

/** A concrete thing about the property or the deal, rather than an adjective. */
const SPECIFIC_REASON =
  /\b(photos?|photography|price|priced|pricing|listing price|days on market|marketing|description|staging|showings?|open house|feedback|exposure|syndicat\w+)\b/i;

/** Saying the decision out loud rather than circling it. */
const PLAIN_STATEMENT =
  /\b(i(?:'m| am) (?:raising|ending|leaving|letting you go|not able to|going to have to)|we(?:'re| are) (?:ending|stopping|parting|moving on)|as of|effective|starting (?:next|in)|my (?:new )?rate)\b/i;

/** Words that recognize the other person's side of it. */
/** Talking about what they already spend, rather than what you charge. */
const STATUS_QUO =
  /\b(today|currently|right now|at the moment|as it stands|manually|by hand|your team (?:spends|spend)|you(?:'re| are) (?:already )?(?:spending|paying)|the way you do it|per month on|a month on)\b/i;

/** Holding the number when asked to cut it. */
const HELD_PRICE =
  /\b(?:can(?:'t|not) (?:discount|go lower|do that)|no discount|not able to discount|the price (?:is|stays)|rather than (?:discount|cut)|instead of (?:a )?discount|what (?:it|the price) buys)\b/i;

const ACKNOWLEDGMENT =
  /\b(i know (?:this|that)|i understand|that(?:'s| is) fair|you(?:'ve| have) been|i(?:'m| am) sorry|i appreciate|it means a lot|you deserve)\b/i;

const STOPWORDS = new Set([
  "about", "after", "again", "against", "because", "before", "being", "between", "could",
  "every", "first", "there", "these", "thing", "think", "those", "through", "under", "where",
  "which", "while", "would", "their", "they", "that", "this", "with", "have", "from", "were",
  "what", "when", "your", "yeah", "really", "going", "right", "still", "thanks",
]);

/** Things said on a call that deserve a second look, and what to do about each. */
const FLAGS: Array<{ kind: FlagKind; test: RegExp; note: string }> = [
  {
    kind: "overclaim",
    test: /\b(guarantee[ds]?|100 ?%|never fails?|zero risk|no risk at all|always works|can(?:'|no)t fail|cannot fail|best in the (?:market|world|business)|the only (?:solution|product|tool)|nobody else can|everyone (?:needs|wants|uses))\b/i,
    note: "That is an absolute. If they check it and it is not true, everything else you said goes with it.",
  },
  {
    kind: "unbacked_claim",
    test: /\b(?:we(?:'| a)re|i(?:'| a)m) confident\b|\btrust me\b|\bwill (?:definitely|certainly|absolutely)\b|\b(?:will|would) be (?:strong|huge|massive|great|fine) at scale\b/i,
    note: "A forecast with nothing behind it. Give the number that supports it, or drop the adjective.",
  },
  {
    kind: "promise",
    test: /\b(?:i|we)(?:'ll| will) (?:have|get|send) (?:it|that|this|them) (?:to|over to|with) you (?:by|today|tonight|tomorrow|this week)\b|\bby (?:tomorrow|tonight|end of (?:the )?day|eod|monday|next week|friday)\b|\b(?:i|we) promise\b|\byou(?:'ll| will) (?:see|have) (?:it|results?) (?:by|within|in) \b/i,
    note: "You made a commitment on the call. Write it down now and keep it, or it becomes the story they tell about you.",
  },
  {
    kind: "pressure",
    test: /\b(?:only today|last chance|offer expires|limited time|decide (?:now|today)|right now or|before it(?:'s| is) gone)\b/i,
    note: "Pressure on a first call costs more trust than it buys.",
  },
  {
    kind: "disparagement",
    test: /\btheir (?:product|tool|team|stuff) is (?:garbage|trash|useless|a joke|terrible|broken)\b|\b(?:scam|rip-?off|incompetent|clueless)\b/i,
    note: "Running down the alternative makes you look worried about it. Talk about what yours does instead.",
  },
];

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

/** Two signals count together only when they land in the same sentence. "Twenty-eight hundred
 *  a month for the team plan. How do you handle this today?" is a price and a question, not a
 *  statement about what today costs them. */
function sameSentence(text: string, a: RegExp, b: RegExp): string | null {
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (a.test(sentence) && b.test(sentence)) return sentence;
  }
  return null;
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

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
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

  if (/agree|follow-up|follow up|next step|specific time|visit/.test(e)) {
    return (t) => findAgreement(t);
  }
  if (/question about|asks? about|before any pitch/.test(e)) {
    // A question asked of them, not an answer given to them.
    return (t) => {
      const hit = traineeTurns(t).find((x) => x.text.includes("?"));
      return hit ? { ...hit, pattern: /[^.?!]*\?/ } : null;
    };
  }
  if (/status quo|current process|current way|costs (?:them )?today/.test(e)) {
    // Their spend, not your price: the turn has to carry a figure and talk about how things
    // are done now, or quoting your own rate would count as reframing.
    return (t) => {
      const hit = traineeTurns(t).find((x) => sameSentence(x.text, NUMERIC, STATUS_QUO) !== null);
      return hit ? { ...hit, pattern: STATUS_QUO } : null;
    };
  }
  if (/discount|declines? or defers?/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => HELD_PRICE.test(x.text));
      return hit ? { ...hit, pattern: HELD_PRICE } : null;
    };
  }
  if (/photos|days on market|named specifically|specific reason/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => SPECIFIC_REASON.test(x.text));
      return hit ? { ...hit, pattern: SPECIFIC_REASON } : null;
    };
  }
  if (/stated plainly|not implied|decision stated/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => PLAIN_STATEMENT.test(x.text));
      return hit ? { ...hit, pattern: PLAIN_STATEMENT } : null;
    };
  }
  if (/recognize|acknowledg|other person/.test(e)) {
    return (t) => {
      const hit = traineeTurns(t).find((x) => ACKNOWLEDGMENT.test(x.text));
      return hit ? { ...hit, pattern: ACKNOWLEDGMENT } : null;
    };
  }
  if (/cut off|interrupt|same claim|pushback|after the objection/.test(e)) {
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
  if (/direct answer|first objection|priority/.test(e)) {
    // Answered their first push: the trainee's next turn after the first objection carries
    // a figure or stays on the objection's own words.
    return (t) => findSurvivedInterrupt(t);
  }
  return null;
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

/** The flags any judge can find by reading the trainee's lines against known patterns. */
export function scanFlags(transcript: TranscriptTurn[]): ReviewFlag[] {
  const found: ReviewFlag[] = [];
  for (const turn of traineeTurns(transcript)) {
    for (const flag of FLAGS) {
      if (!flag.test.test(turn.text)) continue;
      found.push({
        kind: flag.kind,
        note: flag.note,
        span: { turn: turn.turn, quote: quoteAround(turn.text, flag.test) },
      });
    }
  }
  return found;
}

/** What worked and what hurt, read from the rubric verdicts and the call's own numbers. */
function pointsFrom({ verdicts, metrics }: ReviewInput): { good: ReviewPoint[]; bad: ReviewPoint[] } {
  const good: ReviewPoint[] = [];
  const bad: ReviewPoint[] = [];

  for (const v of verdicts) {
    if (v.met) good.push({ text: v.description, span: v.span });
    else bad.push({ text: `Never ${lowerFirst(v.description)}`, span: null });
  }

  const ratio = metrics.talkRatioTrainee;
  if (ratio !== null && ratio >= 0.72) {
    bad.push({
      text: `You talked ${Math.round(ratio * 100)}% of the call. They barely got a word in, and people say yes to calls they got to speak on.`,
      span: null,
    });
  } else if (ratio !== null && ratio >= 0.4 && ratio <= 0.65) {
    good.push({ text: `You left them room. ${Math.round(ratio * 100)}% of the call was yours.`, span: null });
  }

  if (metrics.traineeQuestions === 0 && metrics.traineeTurns >= 3) {
    bad.push({ text: "You did not ask them a single question.", span: null });
  } else if (metrics.traineeQuestions >= 2) {
    good.push({ text: `You asked ${metrics.traineeQuestions} questions instead of only answering theirs.`, span: null });
  }

  // The rubric judge reads "held the point" more generously than the timing metric does;
  // do not say both on one card.
  const heldByRubric = verdicts.some((v) => v.met && /interrupt|pushback|cut off/i.test(`${v.id} ${v.description}`));
  if (metrics.interruptsFaced > 0 && metrics.interruptsSurvived === 0 && !heldByRubric) {
    bad.push({ text: "Every time they pushed, you moved off your point instead of finishing it.", span: null });
  }

  return { good, bad };
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

  async review(input: ReviewInput): Promise<Review> {
    const { good, bad } = pointsFrom(input);
    return { good, bad, flags: scanFlags(input.transcript) };
  }
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

  private async ask(prompt: string, maxTokens: number): Promise<string> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: this.apiKey });
    const response = await client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .map((block) => ("text" in block ? block.text : ""))
      .join("")
      .trim();
  }

  private numbered(transcript: TranscriptTurn[]): string {
    return transcript
      .map((t, i) => `[${i}] ${t.speaker === "user" ? "TRAINEE" : "PERSONA"}: ${t.text}`)
      .join("\n");
  }

  async judge({ transcript, rubric }: JudgeInput): Promise<RubricVerdict[]> {
    const items = rubric
      .map((item) => `- id: ${item.id}\n  asks: ${item.description}\n  proof required: ${item.evidence}`)
      .join("\n");

    const prompt = [
      "You are grading one practice sales or pitch call from its transcript.",
      "TRAINEE is the person being graded. PERSONA is the simulated counterpart.",
      "",
      "Transcript:",
      this.numbered(transcript),
      "",
      "Rubric items:",
      items,
      "",
      'For each item return {"id": string, "met": boolean, "turn": number|null, "quote": string|null, "reason": string|null}.',
      "The quote MUST be copied character for character from the turn you name. Never paraphrase.",
      "If no turn proves the item, set met false and quote null. Do not guess.",
      "Return only a JSON array, no prose.",
    ].join("\n");

    const parsed = parseJsonArray(await this.ask(prompt, 2000));

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
      const { span, reason } = verifySpan(transcript, spanFrom(raw));
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

  async review(input: ReviewInput): Promise<Review> {
    const { transcript } = input;
    const prompt = [
      "You are reviewing one practice sales or pitch call from its transcript, the way a good sales manager would.",
      "TRAINEE is the person being reviewed. PERSONA is the simulated counterpart.",
      "",
      "Transcript:",
      this.numbered(transcript),
      "",
      "Return a JSON object with three arrays:",
      '- "good": things the TRAINEE did that worked, each {"text": string, "turn": number|null, "quote": string|null}',
      '- "bad": things that hurt, same shape',
      '- "flags": things the TRAINEE said that should be looked at again, each {"kind": one of overclaim|unbacked_claim|promise|pressure|disparagement, "note": string, "turn": number, "quote": string}',
      "",
      "A flag is an absolute that cannot be backed, a forecast with nothing behind it, a commitment made on the call,",
      "pressure tactics, or running down the alternative. Every flag MUST quote the TRAINEE's exact words, character for character.",
      "Write text and notes in plain, direct sentences addressed to the trainee as 'you'. No headings, no jargon.",
      "At most four items per array. Return only the JSON object.",
    ].join("\n");

    const text = await this.ask(prompt, 2500);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    let raw: Record<string, unknown> = {};
    if (start !== -1 && end > start) {
      try {
        raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        raw = {};
      }
    }

    const points = (key: "good" | "bad"): ReviewPoint[] =>
      (Array.isArray(raw[key]) ? (raw[key] as Array<Record<string, unknown>>) : [])
        .filter((p) => typeof p.text === "string" && (p.text as string).trim())
        .slice(0, 4)
        .map((p) => ({ text: (p.text as string).trim(), span: verifySpan(transcript, spanFrom(p)).span }));

    const kinds: FlagKind[] = ["overclaim", "unbacked_claim", "promise", "pressure", "disparagement"];
    const modelFlags: ReviewFlag[] = (Array.isArray(raw.flags) ? (raw.flags as Array<Record<string, unknown>>) : [])
      .map((f) => {
        const { span } = verifySpan(transcript, spanFrom(f));
        if (!span || !kinds.includes(f.kind as FlagKind) || typeof f.note !== "string") return null;
        return { kind: f.kind as FlagKind, note: (f.note as string).trim(), span };
      })
      .filter((f): f is ReviewFlag => f !== null);

    // The pattern scan runs too, so a promise the model missed is still caught.
    const seen = new Set(modelFlags.map((f) => `${f.kind}:${f.span.turn}`));
    const flags = [...modelFlags, ...scanFlags(transcript).filter((f) => !seen.has(`${f.kind}:${f.span.turn}`))];

    const good = points("good");
    const bad = points("bad");
    if (good.length === 0 && bad.length === 0) {
      // The model gave nothing usable; fall back to the deterministic read.
      const fallback = pointsFrom(input);
      return { good: fallback.good, bad: fallback.bad, flags };
    }
    return { good, bad, flags };
  }
}

function spanFrom(raw: Record<string, unknown>): EvidenceSpan | null {
  return typeof raw.turn === "number" && typeof raw.quote === "string"
    ? { turn: raw.turn, quote: raw.quote }
    : null;
}

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createJudge(): RubricJudge {
  const provider = (process.env.JUDGE_PROVIDER ?? "stub").trim().toLowerCase();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (provider === "stub" || !apiKey) return new StubJudge();
  return new ModelJudge(apiKey, process.env.JUDGE_MODEL?.trim() || "claude-sonnet-5");
}
