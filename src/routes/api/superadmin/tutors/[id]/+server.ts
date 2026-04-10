import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'super_admin') throw error(401, 'Unauthorized');

	const tenant = await prisma.tenant.findUnique({
		where: { id: params.id },
		include: {
			users: {
				where: { role: 'tutor' },
				select: { display_name: true, email: true, created_at: true },
			},
			_count: { select: { students: true, timesheets: true } },
		},
	});

	if (!tenant) throw error(404, 'Tenant not found');

	const user = tenant.users[0];

	return json({
		id: tenant.id,
		status: tenant.status,
		created_at: tenant.created_at,
		display_name: user?.display_name ?? '—',
		email: user?.email ?? '—',
		student_count: tenant._count.students,
		timesheet_count: tenant._count.timesheets,
	});
};
