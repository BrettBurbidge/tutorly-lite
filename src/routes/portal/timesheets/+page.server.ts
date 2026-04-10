import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	const timesheets = await prisma.timesheet.findMany({
		where: { tenant_id: locals.tenantId! },
		orderBy: { submitted_at: 'desc' },
		include: {
			_count: { select: { appointments: true } },
		},
	});

	return { timesheets };
};
