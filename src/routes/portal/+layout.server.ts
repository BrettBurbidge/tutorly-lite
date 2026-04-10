import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: LayoutServerLoad = async ({ locals }) => {
	const tenantId = locals.tenantId!;

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { display_name: true, enable_students: true },
	});

	return {
		displayName: settings?.display_name ?? 'Tutor',
		enableStudents: settings?.enable_students ?? false,
	};
};
