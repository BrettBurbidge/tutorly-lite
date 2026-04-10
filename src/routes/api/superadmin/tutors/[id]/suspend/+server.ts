import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || locals.role !== 'super_admin') throw error(401, 'Unauthorized');

	const { action } = (await request.json()) as { action: 'suspend' | 'reactivate' };

	if (action !== 'suspend' && action !== 'reactivate') {
		throw error(400, 'action must be "suspend" or "reactivate"');
	}

	const tenant = await prisma.tenant.findUnique({ where: { id: params.id } });
	if (!tenant) throw error(404, 'Tenant not found');

	const newStatus = action === 'suspend' ? 'suspended' : 'active';

	const updated = await prisma.tenant.update({
		where: { id: params.id },
		data: { status: newStatus },
	});

	// If suspending, invalidate the tutor's Supabase sessions via admin API (best-effort)
	if (action === 'suspend') {
		const tutorUser = await prisma.user.findFirst({
			where: { tenant_id: params.id, role: 'tutor' },
			select: { supabase_uid: true },
		});

		if (tutorUser) {
			await locals.supabase.auth.admin
				?.signOut(tutorUser.supabase_uid, 'global')
				.catch(() => {});
		}
	}

	return json({ id: updated.id, status: updated.status });
};
