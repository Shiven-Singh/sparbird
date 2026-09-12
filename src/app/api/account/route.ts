import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/db";
import { isE164 } from "@/lib/mask";

export const runtime = "nodejs";

/**
 * Changes to your own account. Today that is the phone Sparbird rings and the name it uses.
 *
 * The number is taken on trust that it is yours, which is why saving it asks you to say so and
 * why every call still opens by announcing itself. Where OWNER_E164 is set the whole install is
 * pinned to one phone and what is saved here is never dialled.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { phone?: string; name?: string; confirmed?: boolean };
    const store = await getStore();

    if (body.phone !== undefined) {
      const phone = body.phone.trim();
      if (phone && !isE164(phone)) {
        return NextResponse.json(
          { error: "That needs a leading plus and a country code, like +14155550123. No spaces or dashes." },
          { status: 400 },
        );
      }
      if (phone && !body.confirmed) {
        return NextResponse.json(
          { error: "Confirm this is your own phone before saving it." },
          { status: 400 },
        );
      }
      user.phone = phone || null;
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name) user.name = name;
    }

    store.updateUser(user);
    return NextResponse.json({ ok: true, phone: user.phone, name: user.name });
  } catch {
    return NextResponse.json({ error: "That could not be saved." }, { status: 400 });
  }
}
