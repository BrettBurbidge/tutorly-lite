import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
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

	if (!tenant) throw error(404, 'Tutor not found');

	const user = tenant.users[0];

	return {
		tutor: {
			id: tenant.id,
			status: tenant.status,
			created_at: tenant.created_at,
			display_name: user?.display_name ?? '—',
			email: user?.email ?? '—',
			student_count: tenant._count.students,
			timesheet_count: tenant._count.timesheets,
		},
	};
};
