import { createSupabaseServerClient } from '$lib/server/supabase';
import { prisma } from '$lib/server/prisma';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies);

	event.locals.safeGetSession = async () => {
		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error,
		} = await event.locals.supabase.auth.getUser();
		if (error || !user) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Resolve role and tenantId from app_metadata stored by our auth callback
	if (user) {
		const meta = user.app_metadata as Record<string, string> | undefined;
		event.locals.role = (meta?.role as 'tutor' | 'super_admin') ?? null;
		event.locals.tenantId = meta?.tenant_id ?? null;
	} else {
		event.locals.role = null;
		event.locals.tenantId = null;
	}

	// --- Route guards ---
	const path = event.url.pathname;

	// Protect /superadmin/*
	if (path.startsWith('/superadmin')) {
		if (!session) throw redirect(303, '/login');
		if (event.locals.role !== 'super_admin') throw redirect(303, '/portal');
	}

	// Protect /portal/*
	if (path.startsWith('/portal')) {
		if (!session) throw redirect(303, '/login');
		if (event.locals.role === 'super_admin') throw redirect(303, '/superadmin/dashboard');

		// Check suspension
		if (event.locals.tenantId) {
			const tenant = await prisma.tenant.findUnique({
				where: { id: event.locals.tenantId },
				select: { status: true },
			});
			if (tenant?.status === 'suspended') {
				throw redirect(303, '/suspended');
			}
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
