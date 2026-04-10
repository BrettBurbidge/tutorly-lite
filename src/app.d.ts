import type { Session, SupabaseClient } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: import('@supabase/supabase-js').User | null }>;
			session: Session | null;
			user: import('@supabase/supabase-js').User | null;
			tenantId: string | null;
			role: 'tutor' | 'super_admin' | null;
		}
		interface PageData {
			session: Session | null;
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};
