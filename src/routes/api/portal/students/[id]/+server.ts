import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const student = await prisma.student.findFirst({
		where: { id: params.id, tenant_id: locals.tenantId! },
	});
	if (!student) throw error(404, 'Student not found');

	const body = (await request.json()) as Partial<{
		first_name: string;
		last_name: string;
		grade_level: string;
		notes: string;
		parent_id: string;
		rate_type: 'hourly' | 'flat';
		rate_amount: number;
	}>;

	if (body.parent_id) {
		const parent = await prisma.parent.findFirst({
			where: { id: body.parent_id, tenant_id: locals.tenantId! },
		});
		if (!parent) throw error(400, 'Invalid parent_id');
	}

	const updated = await prisma.student.update({
		where: { id: params.id },
		data: body,
		include: { parent: { select: { id: true, first_name: true, last_name: true } } },
	});

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const student = await prisma.student.findFirst({
		where: { id: params.id, tenant_id: locals.tenantId! },
	});
	if (!student) throw error(404, 'Student not found');

	await prisma.student.delete({ where: { id: params.id } });

	return new Response(null, { status: 204 });
};
