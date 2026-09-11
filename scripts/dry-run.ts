/**
 * End to end check with no network, no key, and no phone call.
 *
 * Replays every recorded call through the real persona compiler, the real scoring engine and
 * the real judge, then asserts the things that must stay true: a good pitch scores, a bad one
 * does not, and a platform result that disagrees with its own transcript is caught and set aside.
 *
 *   pnpm e2e:dry
 */

import { listFixtures, loadFixtureOutcome, previewDrill } from "../src/lib/calle";
import { createJudge } from "../src/lib/judge";
import { loadPersona } from "../src/lib/persona";
import { headline, scoreDrill } from "../src/lib/score";
import { toAttemptRecord } from "../src/lib/db";

interface Expectation {
  disposition: "scored" | "unscored";
  disputed: boolean;
  minPoints?: number;
  maxPointsAllowed?: number;
  /** Flags the review must raise on this call. */
  flags?: string[];
}

/** What each recorded call must produce. A change here should be a deliberate one. */
const EXPECTED: Record<string, Expectation> = {
  // "I will have it to you today" is a commitment made on the line.
  "investor-strong": { disposition: "scored", disputed: false, minPoints: 8, flags: ["promise"] },
  // "we are confident the margins will be strong at scale" has nothing behind it.
  "investor-weak": { disposition: "scored", disputed: false, maxPointsAllowed: 2, flags: ["unbacked_claim"] },
  "investor-contradiction": { disposition: "scored", disputed: true, maxPointsAllowed: 2 },
};

function line(char = "-"): string {
  return char.repeat(72);
}

async function main(): Promise<void> {
  if (process.env.SPARBIRD_LIVE === "1") {
    console.error("SPARBIRD_LIVE=1 is set. Unset it before running the dry run.");
    process.exit(2);
  }

  const judge = createJudge();
  const fixtures = listFixtures();
  const failures: string[] = [];

  console.log(line("="));
  console.log(`Sparbird dry run  ·  ${fixtures.length} recorded calls  ·  judge: ${judge.name}`);
  console.log("No call is placed and no API key is read.");
  console.log(line("="));

  for (const fixture of fixtures) {
    const spec = loadPersona(fixture.persona_id);
    const outcome = loadFixtureOutcome(spec, fixture.fixture_id);
    const card = await scoreDrill(spec, outcome, judge);
    const record = toAttemptRecord(outcome, card);

    console.log(`\n${fixture.fixture_id}  ·  ${spec.display_name}`);
    console.log(line());
    console.log(`  ${headline(card)}`);
    console.log(
      `  talk ratio ${card.metrics.talkRatioTrainee ?? "n/a"} · ` +
        `first figure at ${card.metrics.secondsToFirstNumber === null ? "never" : `${card.metrics.secondsToFirstNumber}s`} · ` +
        `held ${card.metrics.interruptsSurvived} of ${card.metrics.interruptsFaced} interrupts`,
    );

    for (const verdict of card.verdicts) {
      const mark = verdict.met ? "met " : "open";
      const detail = verdict.span
        ? `turn ${verdict.span.turn}: "${verdict.span.quote.slice(0, 60)}..."`
        : (verdict.reason ?? "");
      console.log(`  [${mark}] ${verdict.id} (${verdict.weight}) ${detail}`);
    }

    for (const contradiction of card.contradictions) {
      console.log(`  [disputed] ${contradiction.field} claimed "${contradiction.claimed}": ${contradiction.reason}`);
    }

    if (card.review) {
      for (const p of card.review.good) console.log(`  [good] ${p.text}`);
      for (const p of card.review.bad) console.log(`  [bad ] ${p.text}`);
      for (const f of card.review.flags) {
        console.log(`  [flag] ${f.kind} at turn ${f.span.turn}: "${f.span.quote.slice(0, 60)}"`);
      }
    }

    const expected = EXPECTED[fixture.fixture_id];
    if (!expected) {
      console.log("  [warn] no expectation recorded for this fixture");
      continue;
    }
    if (card.disposition !== expected.disposition) {
      failures.push(`${fixture.fixture_id}: expected ${expected.disposition}, got ${card.disposition}`);
    }
    if (card.disputed !== expected.disputed) {
      failures.push(`${fixture.fixture_id}: expected disputed=${expected.disputed}, got ${card.disputed}`);
    }
    if (expected.minPoints !== undefined && card.points < expected.minPoints) {
      failures.push(`${fixture.fixture_id}: expected at least ${expected.minPoints} points, got ${card.points}`);
    }
    if (expected.maxPointsAllowed !== undefined && card.points > expected.maxPointsAllowed) {
      failures.push(`${fixture.fixture_id}: expected at most ${expected.maxPointsAllowed} points, got ${card.points}`);
    }
    if (record.transcript.length !== outcome.transcript.length) {
      failures.push(`${fixture.fixture_id}: stored transcript lost turns`);
    }
    for (const kind of expected.flags ?? []) {
      if (!card.review?.flags.some((f) => f.kind === kind)) {
        failures.push(`${fixture.fixture_id}: expected a "${kind}" flag and none was raised`);
      }
    }
    for (const f of card.review?.flags ?? []) {
      if (!outcome.transcript[f.span.turn]?.text.includes(f.span.quote)) {
        failures.push(`${fixture.fixture_id}: a flag quotes words that are not in the transcript`);
      }
    }
  }

  // The compiled task is what a real call would say. Check the parts that are not optional.
  const spec = loadPersona("first-principles-investor");
  const preview = previewDrill(spec, "+919999999999");
  if (!preview.task.includes("simulated practice persona")) {
    failures.push("compiled task is missing the disclosure line");
  }
  if (!preview.task.includes("+919999999999")) {
    failures.push("compiled task does not address the owner number");
  }
  if (preview.destinationMasked.includes("9999999999")) {
    failures.push("preview leaked the full destination number");
  }

  console.log(`\n${line("=")}`);
  if (failures.length > 0) {
    console.log(`FAILED  ·  ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`PASSED  ·  ${fixtures.length} recorded calls, ${Object.keys(EXPECTED).length} expectations held`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
