"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOut({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className={className}>
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}
