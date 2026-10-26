import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Publishable (anon) key only. Never put the service-role key in the frontend.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

export const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true, // lets a refreshed tab reclaim the same seat
        autoRefreshToken: true,
        storageKey: 'wml-couples-auth',
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}
