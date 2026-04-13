import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: locals.tenantId! },
	});

	if (!settings) throw error(404, 'Settings not found');

	return json(settings);
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') throw error(401, 'Unauthorized');

	const body = (await request.json()) as Partial<{
		display_name: string;
		calendar_color_filter: string;
		fuzzy_match_threshold: number;
		enable_students: boolean;
		google_sheets_file_id: string | null;
	}>;

	if (
		body.fuzzy_match_threshold !== undefined &&
		(body.fuzzy_match_threshold < 0 || body.fuzzy_match_threshold > 1)
	) {
		throw error(400, 'fuzzy_match_threshold must be between 0 and 1');
	}

	// Extract file ID from a full Google Sheets URL if provided
	let sheetsFileId = body.google_sheets_file_id;
	if (sheetsFileId) {
		const match = sheetsFileId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
		if (match) sheetsFileId = match[1];
	}

	const { google_sheets_file_id: _unused, ...rest } = body;
	const updated = await prisma.tutorSettings.update({
		where: { tenant_id: locals.tenantId! },
		data: {
			...rest,
			...(body.google_sheets_file_id !== undefined ? { google_sheets_file_id: sheetsFileId ?? null } : {}),
		},
	});

	// Also update display_name on User record if changed
	if (body.display_name) {
		await prisma.user.updateMany({
			where: { tenant_id: locals.tenantId!, role: 'tutor' },
			data: { display_name: body.display_name },
		});
	}

	return json(updated);
};
