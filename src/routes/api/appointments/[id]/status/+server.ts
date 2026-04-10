import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;
	const body = (await request.json()) as {
		status?: 'default' | 'complete' | 'cancelled' | 'no_show';
		paid?: boolean;
		notes?: string | null;
	};

	const appointment = await prisma.appointmentStatus.findFirst({
		where: { id, tenant_id: tenantId },
	});

	if (!appointment) {
		throw error(404, 'Appointment not found');
	}

	if (appointment.locked) {
		throw error(400, 'Cannot modify a locked appointment');
	}

	const updated = await prisma.appointmentStatus.update({
		where: { id },
		data: {
			...(body.status !== undefined ? { status: body.status } : {}),
			...(body.paid !== undefined ? { paid: body.paid } : {}),
			...(body.notes !== undefined ? { notes: body.notes } : {}),
		},
	});

	return json(updated);
};
