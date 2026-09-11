/**
 * On a fresh instance the history is empty, which makes the demo look like nothing works.
 * With SPARBIRD_SEED=1, the recorded calls are scored once and saved, so there is something
 * to open. Nothing is dialed; these are the same fixtures the dry run uses.
 */

import { listFixtures, loadFixtureOutcome } from "./calle";
import { getStore, toAttemptRecord } from "./db";
import { createJudge } from "./judge";
import { loadPersona } from "./persona";
import { scoreDrill } from "./score";

// Same reason as the store: one flag per process, not per module instance.
const globalForSeed = globalThis as unknown as { __sparbirdSeeded?: boolean };

export async function ensureSeeded(): Promise<void> {
  if (globalForSeed.__sparbirdSeeded || process.env.SPARBIRD_SEED !== "1") return;
  globalForSeed.__sparbirdSeeded = true;

  const store = await getStore();
  if (store.list().length > 0) return;

  const judge = createJudge();
  // Oldest first, so the strongest call ends up at the top of the list.
  const order = ["investor-weak", "investor-contradiction", "investor-strong"];
  const fixtures = listFixtures().sort(
    (a, b) => order.indexOf(a.fixture_id) - order.indexOf(b.fixture_id),
  );

  let offset = fixtures.length;
  for (const fixture of fixtures) {
    try {
      const spec = loadPersona(fixture.persona_id);
      const outcome = loadFixtureOutcome(spec, fixture.fixture_id);
      // Spread the timestamps so the list does not read as three calls in the same second.
      outcome.startedAt = new Date(Date.now() - offset * 3_600_000).toISOString();
      offset -= 1;
      const card = await scoreDrill(spec, outcome, judge);
      store.save(toAttemptRecord(outcome, card));
    } catch {
      // A bad fixture should not stop the app from starting.
    }
  }
}
