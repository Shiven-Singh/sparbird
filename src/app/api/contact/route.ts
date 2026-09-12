import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { isEmail } from "@/lib/auth";

export const runtime = "nodejs";

const LIMIT = 2000;

/**
 * Somebody asking about the Custom plan.
 *
 * Two fields, because everything else about them can be asked in the reply. This exists at all
 * because the alternative was a mailto: link, which asks a person to leave the page, open
 * whatever mail client their machine guesses at, and write the message themselves.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; requirement?: string };

    const email = (body.email ?? "").trim().toLowerCase();
    const requirement = (body.requirement ?? "").trim();

    if (!isEmail(email)) {
      return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
    }
    if (!requirement) {
      return NextResponse.json({ error: "Tell us what you need, even in one line." }, { status: 400 });
    }

    const store = await getStore();
    store.saveEnquiry({
      id: randomUUID(),
      email: email.slice(0, 200),
      requirement: requirement.slice(0, LIMIT),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "That could not be sent." }, { status: 400 });
  }
}
