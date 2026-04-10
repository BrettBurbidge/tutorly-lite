import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const students = await prisma.student.findMany({
		where: { tenant_id: locals.tenantId! },
		orderBy: { last_name: 'asc' },
		include: { parent: { select: { id: true, first_name: true, last_name: true } } },
	});

	return json(students);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const body = (await request.json()) as {
		first_name: string;
		last_name: string;
		parent_id: string;
		grade_level?: string;
		notes?: string;
		rate_type?: 'hourly' | 'flat';
		rate_amount?: number;
	};

	if (!body.first_name || !body.last_name || !body.parent_id) {
		throw error(400, 'first_name, last_name, and parent_id are required');
	}

	// Verify parent belongs to this tenant
	const parent = await prisma.parent.findFirst({
		where: { id: body.parent_id, tenant_id: locals.tenantId! },
	});
	if (!parent) throw error(400, 'Invalid parent_id');

	const student = await prisma.student.create({
		data: {
			tenant_id: locals.tenantId!,
			first_name: body.first_name,
			last_name: body.last_name,
			parent_id: body.parent_id,
			grade_level: body.grade_level ?? null,
			notes: body.notes ?? null,
			rate_type: body.rate_type ?? 'hourly',
			rate_amount: body.rate_amount ?? 0,
		},
		include: { parent: { select: { id: true, first_name: true, last_name: true } } },
	});

	return json(student, { status: 201 });
};
