import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	const [students, parents] = await Promise.all([
		prisma.student.findMany({
			where: { tenant_id: locals.tenantId! },
			orderBy: { last_name: 'asc' },
			include: { parent: { select: { id: true, first_name: true, last_name: true } } },
		}),
		prisma.parent.findMany({
			where: { tenant_id: locals.tenantId! },
			orderBy: { last_name: 'asc' },
			select: { id: true, first_name: true, last_name: true },
		}),
	]);

	return {
		students: students.map((s) => ({ ...s, rate_amount: s.rate_amount ? Number(s.rate_amount) : null })),
		parents,
	};
};
