/**
 * Can this machine place a call right now, and if not, which thing is in the way?
 *
 *   pnpm preflight
 *
 * Everything here is read-only except the last check, which is explained where it runs.
 * No persona is called and your phone does not ring.
 */

import "./env";

import { isE164, maskPhone } from "../src/lib/mask";

const BASE = "https://api.heycall-e.com";

type State = "ok" | "bad" | "note";

function say(state: State, title: string, detail: string): void {
  const mark = state === "ok" ? "  ok  " : state === "bad" ? " FAIL " : " note ";
  console.log(`[${mark}] ${title}`);
  if (detail) console.log(`         ${detail}`);
}

async function main(): Promise<void> {
  console.log("Sparbird preflight\n");
  let blocked = false;

  // 1. The key.
  const key = process.env.CALLE_API_KEY?.trim();
  if (!key) {
    say("bad", "CALL-E API key", "CALLE_API_KEY is not in .env. Get one from the CALL-E dashboard.");
    blocked = true;
  } else {
    const response = await fetch(`${BASE}/v1/goals`, { headers: { Authorization: `Bearer ${key}` } });
    if (response.ok) {
      say("ok", "CALL-E API key", "Accepted.");
    } else {
      say("bad", "CALL-E API key", `CALL-E answered ${response.status}. The key in .env is not being accepted.`);
      blocked = true;
    }
  }

  // 2. The number.
  const owner = process.env.OWNER_E164?.trim();
  if (!owner) {
    say(
      "note",
      "Phone number",
      "OWNER_E164 is not set, so each account rings the number saved on it. Sign in and check /settings.",
    );
  } else if (!isE164(owner)) {
    say("bad", "Phone number", `OWNER_E164 is "${owner}", which is not E.164. It needs a plus and a country code.`);
    blocked = true;
  } else {
    say("ok", "Phone number", `Locked to ${maskPhone(owner)}. No other number can be dialled by this copy.`);
  }

  // 3. The switch.
  const live = process.env.SPARBIRD_LIVE;
  if (live === "1") {
    say("ok", "Live calling", "On. Pressing the button will ring a phone.");
  } else {
    say(
      "note",
      "Live calling",
      `SPARBIRD_LIVE is ${live ? `"${live}"` : "not set"}, so calls replay from recordings. Set it to 1 to dial.`,
    );
  }

  // 3b. The session secret. Not about calls, but a signed-in account is how you are allowed
  //     to place one when the install is locked, and losing the session looks like a bug.
  if (!process.env.SPARBIRD_SECRET?.trim()) {
    say(
      "note",
      "Session secret",
      "SPARBIRD_SECRET is not set, so signing in stops working every time the server restarts. Put any long random string in .env.",
    );
  } else {
    say("ok", "Session secret", "Set, so sessions survive a restart.");
  }

  // 4. The outbound line. This is the one that actually catches a stuck task, and the only
  //    way to ask is to try to start something. The number below is in country code 999,
  //    which the ITU has never assigned, so it cannot reach a person even if it is accepted.
  if (key && !blocked) {
    const response = await fetch(`${BASE}/v1/calls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ task: "sparbird preflight: line check", recipients: [{ phones: ["+9991234567"] }] }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; details?: { max_active_tasks?: number } };
      id?: string;
    };
    const code = payload.error?.code;

    if (code === "account_concurrency_exceeded") {
      const max = payload.error?.details?.max_active_tasks ?? 1;
      say(
        "bad",
        "Outbound line",
        `Busy. Your line allows ${max} call at a time and one is already running. Finish or cancel it at ` +
          "https://dashboard.heycall-e.com, or wait for it to time out.",
      );
      blocked = true;
    } else if (payload.id) {
      // The line was free and CALL-E took the task. It cannot connect to +999, but it may
      // hold the line for a moment, so say so rather than letting it look like a clean pass.
      say("note", "Outbound line", `Free. A check task was created (${payload.id}) and will drop itself shortly.`);
    } else {
      say("ok", "Outbound line", `Free. CALL-E refused the unroutable check number, as it should (${code ?? response.status}).`);
    }
  }

  console.log(
    blocked
      ? "\nSomething is in the way. Fix the FAIL above, then run this again."
      : "\nNothing is in the way. pnpm drill <persona-id>, or pnpm dev and press the button.",
  );
  process.exit(blocked ? 1 : 0);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
