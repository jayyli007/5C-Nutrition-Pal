import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Public values only: the anon key can read menus (row level security allows SELECT) and nothing else.
// Never put the service role key here; everything in a VITE_ variable ships to the browser.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null when the env vars aren't set (local dev without a .env), so the app falls back to sample menus. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null
