/**
 * Turns a profile you are looking at into someone you can practise against.
 *
 * Every trait we give the persona is tied to the words that produced it, so the page can show
 * "they wrote this, so expect this". Only the person's initials and their role survive. Their
 * name, the page text and anything else are used to shape the persona and then dropped.
 */

import { createHash } from "node:crypto";
import type { PersonaSpec, Provenance, ScriptedObjection } from "./types";

export interface RawProfile {
  name?: string;
  headline?: string;
  about?: string;
  recent_posts?: string[];
  source_url?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "TP";
}

/** The job title, without the company or the flourish. */
function roleFrom(headline: string): string {
  const head = headline.split(/\s+at\s+|\s*[|·—]\s*/)[0]?.trim();
  return head && head.length > 2 ? head : "The person you are meeting";
}

interface Signal {
  test: RegExp;
  trait: string;
  objection: string;
}

/** What people say in public tends to tell you how they will push back in private. */
const SIGNALS: Signal[] = [
  {
    test: /\bprice|cost|budget|invoice|spend|cheaper|discount|maths|math\b/i,
    trait: "brings every answer back to what it costs",
    objection: "Before anything else, what is this going to cost me?",
  },
  {
    test: /\bpilot|integration|implement|onboard|rollout|weeks|months to\b/i,
    trait: "asks how long it takes before anything actually works",
    objection: "How long until this is actually running, honestly?",
  },
  {
    test: /\bai\b|\bautomation|\bmodel\b|\bagent\b|\bvisibility\b/i,
    trait: "is tired of pitches that lead with technology",
    objection: "Skip the technology. What changes for my team on Monday?",
  },
  {
    test: /\bteam|hiring|headcount|people|ops\b/i,
    trait: "wants to know who has to change how they work",
    objection: "Who on my side has to do something differently for this to work?",
  },
  {
    test: /\brisk|compliance|audit|security|regulat|downtime\b/i,
    trait: "goes to what could go wrong before what could go right",
    objection: "What happens when this gets something wrong?",
  },
  {
    test: /\bnumber|metric|data|measure|saved|per\b/i,
    trait: "wants the result as a figure, not an adjective",
    objection: "Give me that as a number.",
  },
];

/** The sentence in the source text that tripped the signal, so it can be quoted back. */
function sentenceMatching(text: string, pattern: RegExp): string | null {
  const sentences = text.split(/(?<=[.?!])\s+|\n+/);
  const hit = sentences.find((s) => pattern.test(s));
  return hit ? hit.trim().slice(0, 200) : null;
}

const BASE_RUBRIC = [
  {
    id: "answered_their_priority",
    weight: 3,
    description: "Answered the thing they actually care about",
    evidence: "a direct answer to their first objection",
  },
  {
    id: "quantified_claim",
    weight: 2,
    description: "Backed a claim with a number",
    evidence: "a figure for money, time, or people",
  },
  {
    id: "survived_interrupt",
    weight: 2,
    description: "Held the point through the pushback",
    evidence: "returns to the same claim after being cut off",
  },
  {
    id: "secured_next_step",
    weight: 3,
    description: "Got a concrete next step",
    evidence: "the persona agrees to a specific follow-up",
  },
];

export function buildPersonaFromProfile(profile: RawProfile): PersonaSpec {
  const sources = [profile.headline, profile.about, ...(profile.recent_posts ?? [])].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  const haystack = sources.join("\n");

  const provenance: Provenance[] = [];
  for (const signal of SIGNALS) {
    const because = sentenceMatching(haystack, signal.test);
    if (because) provenance.push({ because, trait: signal.trait, objection: signal.objection });
    if (provenance.length === 3) break;
  }

  const style = [
    "does not accept a claim without something behind it",
    ...provenance.map((p) => p.trait),
    "ends the call the moment they have made up their mind",
  ];

  const objections: ScriptedObjection[] = (
    provenance.length > 0
      ? provenance.map((p) => p.objection)
      : ["Why should I care about this?"]
  ).map((text, index) => ({ after_turn: 2 + index * 3, text }));

  const who = initials(profile.name ?? "");
  const role = roleFrom(profile.headline ?? "");
  const fingerprint = createHash("sha256")
    .update(`${profile.name ?? ""}|${profile.headline ?? ""}|${haystack.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 6);

  const firstObjection = provenance[0]?.objection ?? "Why should I care about this?";

  return {
    id: `profile-${fingerprint}`,
    display_name: `${role} (${who})`,
    source: "profile",
    audience: "whoever is about to meet them",
    summary:
      provenance.length > 0
        ? `Read from what ${who} says in public. Expect someone who ${provenance
            .map((p) => p.trait)
            .join(", ")}.`
        : `We could not read much from this profile, so expect someone who pushes on anything vague.`,
    reads: {
      engages_if: `you give a straight answer to the first thing they push on, which will be “${firstObjection}”`,
      agrees_if: "their own priority has had a straight answer",
    },
    provenance,
    voice: { locale: "en-US", region: "US", pace: "measured", patience: "medium" },
    style,
    hidden_state: {
      engages_only_if: "the trainee answers their first objection without deflecting",
      scripted_objections: objections,
      concession: "agrees to a next step only once their own priority has a straight answer",
    },
    rubric: BASE_RUBRIC,
    max_minutes: 5,
  };
}
