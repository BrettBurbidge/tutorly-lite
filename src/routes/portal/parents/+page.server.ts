import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	const parents = await prisma.parent.findMany({
		where: { tenant_id: locals.tenantId! },
		orderBy: { last_name: 'asc' },
		include: { students: { select: { id: true, first_name: true, last_name: true } } },
	});

	return { parents };
};
