import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const [settings, students] = await Promise.all([
		prisma.tutorSettings.findUnique({ where: { tenant_id: tenantId } }),
		prisma.student.findMany({
			where: { tenant_id: tenantId },
			select: { id: true, first_name: true, last_name: true, rate_type: true, rate_amount: true },
			orderBy: { last_name: 'asc' },
		}),
	]);

	return {
		settings,
		students: students.map((s) => ({ ...s, rate_amount: s.rate_amount ? Number(s.rate_amount) : null })),
	};
};
