import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
	throw new Error("Missing VITE_SUPABASE_URL env var");
}

if (!supabaseAnonKey) {
	throw new Error("Missing VITE_SUPABASE_ANON_KEY env var");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false,
	},
});

// Log connection info for debugging
console.log("[Supabase] Initialized with URL:", supabaseUrl);
console.log("[Supabase] Using anon key (first 20 chars):", supabaseAnonKey?.substring(0, 20));