import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { buildPersonaFromProfile, type RawProfile } from "@/lib/profile";

export const runtime = "nodejs";

/**
 * Called by the browser extension with the profile page you are looking at.
 * The persona is written next to the built-in ones so it shows up on the home page.
 * Only initials and a role are kept; the page text is used and dropped.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profile?: RawProfile };
    if (!body.profile || typeof body.profile !== "object") {
      return NextResponse.json({ error: "No profile came through." }, { status: 400 });
    }

    const persona = buildPersonaFromProfile(body.profile);

    try {
      writeFileSync(
        join(process.cwd(), "personas", `${persona.id}.json`),
        JSON.stringify(persona, null, 2) + "\n",
      );
    } catch {
      return NextResponse.json(
        { error: "This only works on your own machine, where Sparbird can save the persona." },
        { status: 501 },
      );
    }

    return NextResponse.json({ id: persona.id, display_name: persona.display_name });
  } catch {
    return NextResponse.json({ error: "That page could not be read." }, { status: 400 });
  }
}
