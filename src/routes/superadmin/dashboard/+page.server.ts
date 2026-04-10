import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [total, active, suspended, thisMonth, recentSignups] = await Promise.all([
		prisma.tenant.count(),
		prisma.tenant.count({ where: { status: 'active' } }),
		prisma.tenant.count({ where: { status: 'suspended' } }),
		prisma.tenant.count({ where: { created_at: { gte: startOfMonth } } }),
		prisma.tenant.findMany({
			take: 10,
			orderBy: { created_at: 'desc' },
			include: {
				users: {
					where: { role: 'tutor' },
					select: { display_name: true, email: true },
				},
			},
		}),
	]);

	type TenantWithUsers = {
		id: string;
		status: string;
		created_at: Date;
		users: { display_name: string; email: string }[];
	};

	return {
		stats: { total, active, suspended, thisMonth },
		recentSignups: (recentSignups as TenantWithUsers[]).map((t) => ({
			id: t.id,
			status: t.status,
			created_at: t.created_at,
			display_name: t.users[0]?.display_name ?? '—',
			email: t.users[0]?.email ?? '—',
		})),
	};
};
