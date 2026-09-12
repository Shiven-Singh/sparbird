import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { isEmail } from "@/lib/auth";

export const runtime = "nodejs";

const LIMIT = 2000;

/**
 * Somebody asking about the Custom plan.
 *
 * This exists because the alternative was a mailto: link, which asks a person to leave the page,
 * open whatever mail client their machine guesses at, and write the message themselves. Most
 * never come back. The ask is written down here instead.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      company?: string;
      seats?: string;
      message?: string;
    };

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const message = (body.message ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "We need a name to reply to." }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Tell us what you are after, even in one line." }, { status: 400 });
    }

    const store = await getStore();
    store.saveEnquiry({
      id: randomUUID(),
      name: name.slice(0, 200),
      email: email.slice(0, 200),
      company: (body.company ?? "").trim().slice(0, 200),
      seats: (body.seats ?? "").trim().slice(0, 60),
      message: message.slice(0, LIMIT),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "That could not be sent." }, { status: 400 });
  }
}
