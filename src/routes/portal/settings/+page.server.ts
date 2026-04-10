import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ locals }) => {
	const [settings, dbUser] = await Promise.all([
		prisma.tutorSettings.findUnique({ where: { tenant_id: locals.tenantId! } }),
		prisma.user.findFirst({
			where: { tenant_id: locals.tenantId!, role: 'tutor' },
			select: { email: true, display_name: true },
		}),
	]);

	return {
		settings,
		email: dbUser?.email ?? '',
		googleDisplayName: dbUser?.display_name ?? '',
		enableStudents: settings?.enable_students ?? false,
	};
};
