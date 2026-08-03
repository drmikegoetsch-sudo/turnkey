import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeForm } from "./intake-form";

export const metadata = {
  title: "Work Inquiry",
  description:
    "Tell Turnkey Solutions Network about your project. We'll contact you within 48 hours.",
};
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const admin = createAdminClient();
  const { data: types } = await admin
    .from("project_types")
    .select("label")
    .eq("active", true)
    .order("position");

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      <header className="flex justify-center px-4 pt-8 pb-2">
        <Image
          src="/logo.png"
          alt="Turnkey Solutions Network"
          width={260}
          height={87}
          priority
          className="h-auto w-48 sm:w-56"
        />
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:py-10">
        <IntakeForm projectTypes={types?.map((t) => t.label) ?? []} />
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        Turnkey Solutions Network
      </footer>
    </div>
  );
}
