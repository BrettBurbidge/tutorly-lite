import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const parents = await prisma.parent.findMany({
		where: { tenant_id: locals.tenantId! },
		orderBy: { last_name: 'asc' },
		include: { students: { select: { id: true, first_name: true, last_name: true } } },
	});

	return json(parents);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const body = (await request.json()) as {
		first_name: string;
		last_name: string;
		email?: string;
		phone?: string;
	};

	if (!body.first_name || !body.last_name) {
		throw error(400, 'first_name and last_name are required');
	}

	const parent = await prisma.parent.create({
		data: {
			tenant_id: locals.tenantId!,
			first_name: body.first_name,
			last_name: body.last_name,
			email: body.email ?? null,
			phone: body.phone ?? null,
		},
	});

	return json(parent, { status: 201 });
};
