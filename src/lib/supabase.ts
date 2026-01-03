import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase URL and Anon Key - these will be fetched from Vite environment variables
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment
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
    onAuthStateChange: (_callback: (event: string, session: null) => void) => ({ 
      data: { subscription: { unsubscribe: () => {} } } 
    }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
  }),
} as unknown as SupabaseClient;

// Export the supabase client (real or mock)
export const supabase = supabaseInstance || mockClient;
