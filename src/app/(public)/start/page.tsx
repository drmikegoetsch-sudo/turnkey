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
    <div className="min-h-svh bg-background">
      <header className="bg-sidebar py-6">
        <div className="mx-auto flex max-w-2xl justify-center px-4">
          <Image
            src="/logo.png"
            alt="Turnkey Solutions Network"
            width={240}
            height={80}
            priority
          />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Work Inquiry</h1>
        <p className="mt-2 text-muted-foreground">
          Please fill out all required fields. You will be contacted within 48
          hours to discuss your submission and schedule an initial visit. Thank
          you!
        </p>
        <div className="mt-8">
          <IntakeForm projectTypes={types?.map((t) => t.label) ?? []} />
        </div>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Turnkey Solutions Network
      </footer>
    </div>
  );
}
