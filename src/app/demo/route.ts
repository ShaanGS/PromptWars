import { NextResponse } from "next/server";
import { isStaticDemo, supabaseServer } from "@/repo/server";
import { FLAGSHIP_PROJECT_ID } from "@/lib/constants";

// The judge path: one click from the landing page into a fully seeded
// workspace. Anonymous sign-in, zero forms. Never cache — it sets cookies.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = new URL(`/projects/${FLAGSHIP_PROJECT_ID}`, request.url);
  if (isStaticDemo()) return NextResponse.redirect(target);

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      // Auth down ≠ demo down: seed data is world-readable, the sandbox is
      // client-side. Continue signed-out.
      console.error("anonymous sign-in failed:", error.message);
    }
  }
  return NextResponse.redirect(target);
}
