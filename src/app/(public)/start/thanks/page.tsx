import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Thank You" };

export default function ThanksPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar px-4 text-center">
      <Image
        src="/logo.png"
        alt="Turnkey Solutions Network"
        width={260}
        height={87}
        priority
      />
      <div className="mt-10 max-w-md rounded-xl bg-card p-8 shadow-lg">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">Inquiry received!</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you for reaching out. We&apos;ll review your project and contact
          you within 48 hours to discuss the details and schedule an initial
          visit.
        </p>
      </div>
    </div>
  );
}
