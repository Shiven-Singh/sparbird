import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await currentUser()) redirect("/");
  const query = await searchParams;
  const wanted = typeof query.plan === "string" ? query.plan : "solo";
  const plan = PLANS.find((p) => p.id === wanted) ?? PLANS[0]!;

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:py-20">
      <Link href="/pricing" className="label text-muted hover:text-text">
        ← All plans
      </Link>
      <h1 className="h1 appear appear--soft d-2 mt-6 text-[30px] text-text">
        Start on <em>{plan.name}</em>.
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {plan.price} · {plan.minutes}. No card needed to set up; billing starts when you place your first call.
      </p>
      <div className="panel appear appear--soft d-3 mt-8 p-6">
        <AuthForm mode="signup" plan={plan.id} />
      </div>
    </div>
  );
}
