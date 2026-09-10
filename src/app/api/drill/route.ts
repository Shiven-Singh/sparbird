import { NextResponse } from "next/server";
import { runDrill } from "@/lib/calle";
import { getStore, toAttemptRecord } from "@/lib/db";
import { createJudge } from "@/lib/judge";
import { listPersonaIds, loadPersona } from "@/lib/persona";
import { scoreDrill } from "@/lib/score";

export const runtime = "nodejs";
// A live call runs for minutes, so this route must not be cut short.
export const maxDuration = 800;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { personaId?: string; fixtureId?: string };
    const personaId = body.personaId;

    if (!personaId || !listPersonaIds().includes(personaId)) {
      return NextResponse.json({ error: "We do not have that person on file." }, { status: 400 });
    }

    const persona = loadPersona(personaId);
    const outcome = await runDrill(persona, {
      fixtureId: body.fixtureId,
      idempotencyKey: `sparbird:${personaId}:${new Date().toISOString().slice(0, 16)}`,
    });

    const card = await scoreDrill(persona, outcome, createJudge());
    const record = toAttemptRecord(outcome, card);
    const store = await getStore();
    store.save(record);

    return NextResponse.json({ attemptId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The call could not be made.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
