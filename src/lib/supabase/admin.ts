import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — used ONLY for:
//   1. Public intake form submission (validated server action)
//   2. Tokenized share-link pages (/sub/[token], /status/[token])
//   3. Signed upload URL minting
// Never import from a client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
