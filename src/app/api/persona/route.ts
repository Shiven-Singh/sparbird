import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { buildPersonaFromProfile, type RawProfile } from "@/lib/profile";

export const runtime = "nodejs";

const MAX_BATCH = 50;

/**
 * Turns one profile, or up to fifty of them, into people you can practice against.
 * The persona is written next to the built-in ones so it shows up on the home page.
 * Only initials and a role are kept; the pasted text is used and dropped.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profile?: RawProfile; profiles?: RawProfile[] };
    const incoming: RawProfile[] = Array.isArray(body.profiles)
      ? body.profiles
      : body.profile && typeof body.profile === "object"
        ? [body.profile]
        : [];

    const usable = incoming
      .filter((p) => p && typeof p === "object")
      .filter((p) => [p.headline, p.about, ...(p.recent_posts ?? [])].some((s) => typeof s === "string" && s.trim()))
      .slice(0, MAX_BATCH);

    if (usable.length === 0) {
      return NextResponse.json({ error: "Nothing readable came through. A headline or a few sentences is enough." }, { status: 400 });
    }

    const user = await currentUser();
    const made: Array<{ id: string; display_name: string }> = [];
    for (const profile of usable) {
      const persona = { ...buildPersonaFromProfile(profile), owner: user?.id ?? null };
      try {
        writeFileSync(join(process.cwd(), "personas", `${persona.id}.json`), JSON.stringify(persona, null, 2) + "\n");
      } catch {
        return NextResponse.json(
          { error: "This only works where Sparbird can save the persona to disk." },
          { status: 501 },
        );
      }
      made.push({ id: persona.id, display_name: persona.display_name });
    }

    const first = made[0]!;
    return NextResponse.json({ id: first.id, display_name: first.display_name, personas: made, skipped: incoming.length - usable.length });
  } catch {
    return NextResponse.json({ error: "That could not be read." }, { status: 400 });
  }
}
