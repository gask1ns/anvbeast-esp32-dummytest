import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && (serviceRoleKey || anonKey));

export function createServerSupabaseClient() {
  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    throw new Error("Supabase environment variable belum lengkap.");
  }

  return createClient(supabaseUrl, serviceRoleKey ?? anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
