import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session || locals.role !== 'super_admin') throw error(401, 'Unauthorized');

	const search = url.searchParams.get('search') ?? '';
	const status = url.searchParams.get('status') as 'active' | 'suspended' | null;

	const tenants = await prisma.tenant.findMany({
		where: {
			...(status ? { status } : {}),
		},
		include: {
			users: {
				where: { role: 'tutor' },
				select: { display_name: true, email: true, created_at: true },
			},
			_count: {
				select: { students: true, timesheets: true },
			},
		},
		orderBy: { created_at: 'desc' },
	});

	type TenantRow = {
		id: string;
		status: string;
		created_at: Date;
		users: { display_name: string; email: string; created_at: Date }[];
		_count: { students: number; timesheets: number };
	};

	const rows = (tenants as TenantRow[])
		.map((t) => {
			const user = t.users[0];
			return {
				id: t.id,
				status: t.status,
				created_at: t.created_at,
				display_name: user?.display_name ?? '—',
				email: user?.email ?? '—',
				student_count: t._count.students,
				timesheet_count: t._count.timesheets,
			};
		})
		.filter(
			(r) =>
				!search ||
				r.display_name.toLowerCase().includes(search.toLowerCase()) ||
				r.email.toLowerCase().includes(search.toLowerCase())
		);

	return json(rows);
};
