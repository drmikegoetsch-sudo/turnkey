import Image from "next/image";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export const metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="app-ambient flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Turnkey Solutions Network"
            width={260}
            height={87}
            priority
            className="h-auto w-56"
          />
        </div>

        <div className="glass rounded-2xl p-7">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your projects.
          </p>

          <form action={login} className="mt-6 grid gap-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 bg-white/70 backdrop-blur-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-11 bg-white/70 backdrop-blur-sm"
              />
            </div>

            {error ? (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="glass-cta mt-1 w-full rounded-full font-semibold shadow-none hover:bg-transparent"
            >
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Turnkey Solutions Network
        </p>
      </div>
    </div>
  );
}
