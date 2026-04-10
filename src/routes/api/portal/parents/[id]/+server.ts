import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const parent = await prisma.parent.findFirst({
		where: { id: params.id, tenant_id: locals.tenantId! },
	});
	if (!parent) throw error(404, 'Parent not found');

	const body = (await request.json()) as Partial<{
		first_name: string;
		last_name: string;
		email: string;
		phone: string;
	}>;

	const updated = await prisma.parent.update({
		where: { id: params.id },
		data: body,
	});

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const parent = await prisma.parent.findFirst({
		where: { id: params.id, tenant_id: locals.tenantId! },
	});
	if (!parent) throw error(404, 'Parent not found');

	await prisma.parent.delete({ where: { id: params.id } });

	return new Response(null, { status: 204 });
};
