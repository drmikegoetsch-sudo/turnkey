import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Thank You" };

export default function ThanksPage() {
  return (
    <div className="app-ambient flex min-h-svh flex-col items-center justify-center px-4 py-10 text-center">
      <Image
        src="/logo.png"
        alt="Turnkey Solutions Network"
        width={260}
        height={87}
        priority
        className="h-auto w-52"
      />
      <div className="glass mt-10 max-w-md rounded-2xl p-8 animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">
          Inquiry received
        </h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for the detail — it genuinely helps. We&apos;ll review your
          project and reach out within 48 hours to schedule a visit.
        </p>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Turnkey Solutions Network
      </p>
    </div>
  );
}
