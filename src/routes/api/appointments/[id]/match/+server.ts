import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { normalizeEventTitle } from '$lib/utils';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;
	const { studentId } = (await request.json()) as { studentId: string };

	if (!studentId) {
		throw error(400, 'studentId is required');
	}

	const appointment = await prisma.appointmentStatus.findFirst({
		where: { id, tenant_id: tenantId },
	});

	if (!appointment) {
		throw error(404, 'Appointment not found');
	}

	// Verify student belongs to this tenant
	const student = await prisma.student.findFirst({
		where: { id: studentId, tenant_id: tenantId },
	});

	if (!student) {
		throw error(404, 'Student not found');
	}

	// Update appointment
	const updated = await prisma.appointmentStatus.update({
		where: { id },
		data: { matched_student_id: studentId },
	});

	// Cache the match for future auto-matching
	const normalized = normalizeEventTitle(appointment.google_event_title);
	await prisma.nameMatchCache.upsert({
		where: {
			normalized_event_title_tenant_id: {
				normalized_event_title: normalized,
				tenant_id: tenantId,
			},
		},
		update: { matched_student_id: studentId },
		create: {
			tenant_id: tenantId,
			normalized_event_title: normalized,
			matched_student_id: studentId,
		},
	});

	return json(updated);
};
