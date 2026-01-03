import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase URL and Anon Key - these will be fetched from environment variables
// The SUPABASE_ANON_KEY is stored in Convex environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Export a function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Create Supabase client only if configured, otherwise create a placeholder
// that won't throw errors but won't work either
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

// Create a mock client for when Supabase is not configured
// This prevents the app from crashing but shows appropriate UI messages
const mockClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve({ error: null }),
  },
} as unknown as SupabaseClient;

// Export the supabase client (real or mock)
export const supabase = supabaseInstance || mockClient;
