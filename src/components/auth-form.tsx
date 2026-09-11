"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  mode: "signin" | "signup";
  plan?: string;
}

export function AuthForm({ mode, plan }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: mode, name, email, password, plan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That did not work.");
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {mode === "signup" ? (
        <div>
          <label htmlFor="name" className="label mb-1.5 block text-muted">
            Your name
          </label>
          <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" autoComplete="name" />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="label mb-1.5 block text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="label mb-1.5 block text-muted">
          Password {mode === "signup" ? <span className="font-normal normal-case tracking-normal">(eight characters or more)</span> : null}
        </label>
        <input
          id="password"
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </div>

      <button type="submit" disabled={busy} className="btn btn-solid mt-1 w-full">
        {busy ? "One moment" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {error ? <p className="text-[13px] text-bad">{error}</p> : null}

      <p className="text-[13px] text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="text-text underline decoration-dotted underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/pricing" className="text-text underline decoration-dotted underline-offset-4">
              See the plans
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
