import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const body = (await request.json()) as {
		appointmentIds: string[];
		periodStart: string;
		periodEnd: string;
		periodType: 'day' | 'week';
	};

	const { appointmentIds, periodStart, periodEnd, periodType } = body;

	if (!appointmentIds?.length || !periodStart || !periodEnd || !periodType) {
		throw error(400, 'Missing required fields');
	}

	// Verify all appointments belong to this tenant and are not already locked
	const appointments = await prisma.appointmentStatus.findMany({
		where: { id: { in: appointmentIds }, tenant_id: tenantId },
	});

	if (appointments.length !== appointmentIds.length) {
		throw error(400, 'One or more appointments not found');
	}

	type Appt = { id: string; locked: boolean; status: string; matched_student_id: string | null };

	const alreadyLocked = (appointments as Appt[]).some((a) => a.locked);
	if (alreadyLocked) {
		throw error(400, 'One or more appointments are already locked');
	}

	// Check for unresolved unmatched appointments only when students feature is enabled
	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { enable_students: true },
	});

	if (settings?.enable_students) {
		const unresolved = (appointments as Appt[]).filter(
			(a) =>
				!a.matched_student_id &&
				(a.status === 'complete' || a.status === 'no_show')
		);

		if (unresolved.length > 0) {
			throw error(400, 'Unresolved unmatched appointments must be assigned before confirming');
		}
	}

	// Create timesheet and lock appointments in one transaction
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const timesheet = await prisma.$transaction(async (tx: any) => {
		const ts = await tx.timesheet.create({
			data: {
				tenant_id: tenantId,
				period_start: new Date(periodStart),
				period_end: new Date(periodEnd),
				period_type: periodType,
			},
		});

		await tx.appointmentStatus.updateMany({
			where: { id: { in: appointmentIds }, tenant_id: tenantId },
			data: { locked: true, timesheet_id: ts.id },
		});

		return ts;
	});

	return json(timesheet);
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;

	const timesheets = await prisma.timesheet.findMany({
		where: { tenant_id: tenantId },
		orderBy: { submitted_at: 'desc' },
		include: {
			appointments: {
				include: { matched_student: { include: { parent: true } } },
			},
		},
	});

	return json(timesheets);
};
