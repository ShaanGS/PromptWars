// The ONLY module allowed to import Supabase (with client.ts for the browser).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./public-keys";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; route handlers and
            // server actions can. Reads still work either way.
          }
        },
      },
    },
  );
}

export function isStaticDemo(): boolean {
  return process.env.DEMO_MODE === "static";
}
