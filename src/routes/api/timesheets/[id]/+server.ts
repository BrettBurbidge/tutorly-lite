import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;

	const timesheet = await prisma.timesheet.findFirst({
		where: { id, tenant_id: tenantId },
	});

	if (!timesheet) {
		throw error(404, 'Timesheet not found');
	}

	await prisma.$transaction([
		// Unlock all appointments and detach from timesheet
		prisma.appointmentStatus.updateMany({
			where: { timesheet_id: id, tenant_id: tenantId },
			data: { locked: false, timesheet_id: null },
		}),
		prisma.timesheet.delete({
			where: { id },
		}),
	]);

	return json({ ok: true });
};
