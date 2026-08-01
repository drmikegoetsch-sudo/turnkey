import Image from "next/image";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-sidebar px-4">
      <div className="mb-8">
        <Image
          src="/logo.png"
          alt="Turnkey Solutions Network"
          width={280}
          height={93}
          priority
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Command Center</CardTitle>
          <CardDescription>Sign in to manage your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
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
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
