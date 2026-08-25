// Publishable values — they ship in every browser bundle by design and are
// safe in source. Row Level Security is the actual security boundary.
// Env vars still win when set (e.g. pointing a preview at another project).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fjxgqiveolnnrslihodl.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_IyaMeO1ngN7JBBPSHwU8aQ_xp6Q4LtX";
