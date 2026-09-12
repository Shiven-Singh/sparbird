import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionValue,
  hashPassword,
  isEmail,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { getStore } from "@/lib/db";
import { isE164 } from "@/lib/mask";

export const runtime = "nodejs";

const PLANS = new Set(["solo", "fixed", "custom"]);

/** Sign up, sign in, sign out. One route so the session cookie is set in one place. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      email?: string;
      password?: string;
      name?: string;
      plan?: string;
      phone?: string;
    };
    const store = await getStore();

    if (body.action === "signout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(request), maxAge: 0 });
      return response;
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!isEmail(email)) {
      return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Use at least eight characters." }, { status: 400 });
    }

    if (body.action === "signup") {
      if (store.getUserByEmail(email)) {
        return NextResponse.json({ error: "There is already an account with that email. Sign in instead." }, { status: 409 });
      }
      // Optional at signup, required before a phone can ring. Better to let someone in first.
      const phone = (body.phone ?? "").trim();
      if (phone && !isE164(phone)) {
        return NextResponse.json(
          { error: "That phone number needs a leading plus and a country code, like +14155550123." },
          { status: 400 },
        );
      }
      const user = {
        id: randomUUID(),
        email,
        name: (body.name ?? "").trim() || email.split("@")[0]!,
        passwordHash: hashPassword(password),
        plan: PLANS.has(body.plan ?? "") ? body.plan! : "solo",
        phone: phone || null,
        createdAt: new Date().toISOString(),
      };
      store.createUser(user);
      const response = NextResponse.json({ ok: true, name: user.name });
      response.cookies.set(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions(request));
      return response;
    }

    if (body.action === "signin") {
      const user = store.getUserByEmail(email);
      // The same message either way, so this cannot be used to discover who has an account.
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "That email and password do not match." }, { status: 401 });
      }
      const response = NextResponse.json({ ok: true, name: user.name });
      response.cookies.set(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions(request));
      return response;
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "That could not be processed." }, { status: 400 });
  }
}
