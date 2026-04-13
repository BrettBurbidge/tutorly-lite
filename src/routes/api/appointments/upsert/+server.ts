import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const body = (await request.json()) as {
		google_event_id: string;
		google_event_title: string;
		date: string;
		start_time: string;
		end_time: string;
		location?: string | null;
		matched_student_id?: string | null;
		status?: 'default' | 'complete' | 'cancelled' | 'no_show';
	};

	const appointment = await prisma.appointmentStatus.upsert({
		where: {
			google_event_id_tenant_id: {
				google_event_id: body.google_event_id,
				tenant_id: tenantId,
			},
		},
		create: {
			tenant_id: tenantId,
			google_event_id: body.google_event_id,
			google_event_title: body.google_event_title,
			// Extract the local date from the timezone-aware ISO string (e.g. "2026-04-16T13:45:00-06:00" → "2026-04-16")
			// so PostgreSQL stores the calendar's local date, not the UTC date.
			date: new Date(`${body.date.split('T')[0]}T00:00:00.000Z`),
			start_time: new Date(body.start_time),
			end_time: new Date(body.end_time),
			location: body.location ?? null,
			matched_student_id: body.matched_student_id ?? null,
			status: body.status ?? 'default',
		},
		update: {
			// Only update title/times/location if not locked; never override user-set status
			google_event_title: body.google_event_title,
			date: new Date(`${body.date.split('T')[0]}T00:00:00.000Z`),
			start_time: new Date(body.start_time),
			end_time: new Date(body.end_time),
			location: body.location ?? null,
		},
		include: {
			matched_student: {
				include: { parent: { select: { id: true, first_name: true, last_name: true } } },
			},
		},
	});

	return json(appointment);
};
