import { createClient } from '@supabase/supabase-js';

let browserSupabaseClient: ReturnType<typeof createClient> | null = null;
const AUTH_STORAGE_KEY = 'chakri-ai-auth';

export function createSupabaseClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
	}

	if (typeof window === 'undefined') {
		return createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
			},
		});
	}

	if (!browserSupabaseClient) {
		browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
				storageKey: AUTH_STORAGE_KEY,
			},
		});
	}

	return browserSupabaseClient;
}
