import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await currentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-20">
      <Link href="/" className="label text-muted hover:text-text">
        ← Back
      </Link>
      <h1 className="h1 appear appear--soft d-2 mt-6 text-[30px] text-text">
        Welcome <em>back</em>.
      </h1>
      <p className="mt-2 text-[15px] text-muted">Your callers and your past calls are where you left them.</p>
      <div className="panel appear appear--soft d-3 mt-8 rounded-lg p-6">
        <AuthForm mode="signin" />
      </div>
    </div>
  );
}
