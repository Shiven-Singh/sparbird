/**
 * Run one drill from the terminal.
 *
 *   pnpm drill first-principles-investor            # preview, or replay a recorded call
 *   SPARBIRD_LIVE=1 pnpm drill first-principles-investor   # rings your phone, after you confirm
 *
 * With SPARBIRD_LIVE unset this prints the task that would be spoken and replays a recorded
 * call. With it set, the destination is shown masked and nothing is dialled until you type yes.
 * Either way .env is read first, so the settings the app uses are the settings this uses.
 */

import "./env";

import { createInterface } from "node:readline/promises";
import { isLive, previewDrill, runDrill } from "../src/lib/calle";
import { getStore, toAttemptRecord } from "../src/lib/db";
import { createJudge } from "../src/lib/judge";
import { listPersonaIds, loadPersona } from "../src/lib/persona";
import { headline, scoreDrill } from "../src/lib/score";

function line(char = "-"): string {
  return char.repeat(72);
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.error(
      "Refusing to place a call without an interactive confirmation. " +
        "Run this in a terminal, or unset SPARBIRD_LIVE to replay a recorded call.",
    );
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const personaId = args.find((a) => !a.startsWith("--"));
  const fixtureArg = args.find((a) => a.startsWith("--fixture="))?.split("=")[1];
  const showTask = args.includes("--show-task");

  if (!personaId) {
    console.log("Usage: pnpm drill <persona-id> [--fixture=<id>] [--show-task]");
    console.log(`Personas: ${listPersonaIds().join(", ")}`);
    process.exit(1);
  }

  const spec = loadPersona(personaId);
  const preview = previewDrill(spec);

  console.log(line("="));
  console.log(`${spec.display_name}  ·  ${spec.id}`);
  if (spec.summary) console.log(spec.summary);
  console.log(line("="));
  console.log(`Mode        : ${preview.live ? "LIVE, this will ring a phone" : "dry run, replaying a recorded call"}`);
  console.log(`Destination : ${preview.destinationMasked}`);
  if (!preview.live) {
    const why = !process.env.SPARBIRD_LIVE
      ? "SPARBIRD_LIVE is not set"
      : process.env.SPARBIRD_LIVE !== "1"
        ? `SPARBIRD_LIVE is "${process.env.SPARBIRD_LIVE}", which is not "1"`
        : "live calling is off";
    const missing = [
      !process.env.OWNER_E164?.trim() ? "OWNER_E164 is not set" : null,
      !process.env.CALLE_API_KEY?.trim() ? "CALLE_API_KEY is not set" : null,
    ].filter(Boolean);
    console.log(`Why not live: ${[why, ...missing].join("; ")}`);
  }
  console.log(`Length cap  : ${preview.maxMinutes} minutes`);
  console.log(`Rubric      : ${spec.rubric.map((r) => `${r.id} (${r.weight})`).join(", ")}`);

  if (showTask) {
    console.log(`\n${line()}\nTask as CALL-E will run it:\n${line()}`);
    console.log(preview.task);
  }

  if (isLive()) {
    console.log(`\n${line()}`);
    const ok = await confirm(`Place a real call to ${preview.destinationMasked}? Type yes to dial: `);
    if (!ok) {
      console.log("Nothing dialled.");
      process.exit(0);
    }
    console.log("Dialling. Answer your phone.");
  }

  const outcome = await runDrill(spec, {
    fixtureId: fixtureArg,
    // Derived from the drill, not the attempt, so a retry cannot become a second call.
    idempotencyKey: `sparbird:${spec.id}:${new Date().toISOString().slice(0, 16)}`,
  });

  const judge = createJudge();
  const card = await scoreDrill(spec, outcome, judge);

  console.log(`\n${line("=")}`);
  console.log(headline(card));
  console.log(line("="));
  console.log(
    `talk ratio ${card.metrics.talkRatioTrainee ?? "n/a"} · ` +
      `${card.metrics.traineeTurns} turns · ` +
      `first figure at ${card.metrics.secondsToFirstNumber === null ? "never" : `${card.metrics.secondsToFirstNumber}s`} · ` +
      `held ${card.metrics.interruptsSurvived} of ${card.metrics.interruptsFaced} interrupts`,
  );

  for (const verdict of card.verdicts) {
    console.log(`\n[${verdict.met ? "met" : "open"}] ${verdict.description} (${verdict.weight} pts)`);
    if (verdict.span) {
      console.log(`  turn ${verdict.span.turn}: "${verdict.span.quote}"`);
    } else if (verdict.reason) {
      console.log(`  ${verdict.reason}`);
    }
  }

  if (card.contradictions.length > 0) {
    console.log(`\n${line()}`);
    console.log("CALL-E's own result disagrees with the transcript, so it was set aside:");
    for (const c of card.contradictions) {
      console.log(`  ${c.field} claimed "${c.claimed}" — ${c.reason}`);
    }
  }

  if (card.strongestMoment) console.log(`\nStrongest: ${card.strongestMoment}`);
  if (card.weakestMoment) console.log(`Weakest  : ${card.weakestMoment}`);

  const store = await getStore();
  store.save(toAttemptRecord(outcome, card));
  console.log(`\nSaved to the ${store.kind} store.`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
