import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSubIdentity } from "@/lib/sub-session";
import { logout } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Deliberately minimal shell. Subs get their jobs and nothing else — no
// board, no customers, no dollar values.
export default async function SubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getSubIdentity();
  if (!identity) redirect("/login");

  return (
    <div className="app-ambient flex min-h-svh flex-col">
      <header className="glass-bar sticky top-0 z-40">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/my-jobs">
            <Image
              src="/logo.png"
              alt="Turnkey Solutions Network"
              width={130}
              height={43}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {identity.name}
            </span>
            <form action={logout}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
