import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (composants « use client »).
 * Utilise les variables publiques exposées au bundle client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
