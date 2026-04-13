import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { getAuthenticatedClient } from '$lib/server/googleAuth';
import { google } from 'googleapis';
import { formatDurationHours } from '$lib/utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtTime(d: Date) {
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;

	// Load settings to get target file ID
	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: {
			display_name: true,
			enable_students: true,
			google_sheets_file_id: true,
		},
	});

	if (!settings?.google_sheets_file_id) {
		throw error(400, 'NO_SHEETS_FILE');
	}

	// Load timesheet + appointments (same query as existing export)
	const timesheet = await prisma.timesheet.findFirst({
		where: { id, tenant_id: tenantId },
		include: {
			appointments: {
				include: { matched_student: { include: { parent: true } } },
				orderBy: { date: 'asc' },
			},
		},
	});

	if (!timesheet) throw error(404, 'Timesheet not found');

	// Get authenticated Google client
	let auth;
	try {
		auth = await getAuthenticatedClient(tenantId);
	} catch (e: unknown) {
		if (e instanceof Error && e.message === 'MISSING_TOKENS') {
			console.error('[export-to-drive] MISSING_TOKENS for tenant', tenantId);
			throw error(403, 'MISSING_TOKENS');
		}
		console.error('[export-to-drive] Auth error:', e);
		throw error(500, 'Auth error');
	}

	const sheets = google.sheets({ version: 'v4', auth });

	const tutorName = settings.display_name ?? 'Tutor';
	const enableStudents = settings.enable_students ?? false;

	// Tab name: "M-D to M-D"
	const shortDate = (d: Date) => `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
	const tabName = `${shortDate(timesheet.period_start)} to ${shortDate(timesheet.period_end)}`;

	// Check target spreadsheet exists and look for duplicate tab
	let spreadsheet;
	try {
		spreadsheet = await sheets.spreadsheets.get({
			spreadsheetId: settings.google_sheets_file_id,
			fields: 'sheets.properties.title',
		});
	} catch (e: unknown) {
		const errMsg = (e as { message?: string })?.message ?? '';
		const status = (e as { code?: number })?.code;
		console.error('[export-to-drive] Sheets API error:', status, errMsg);
		if (errMsg.includes('invalid_grant')) throw error(403, 'MISSING_TOKENS');
		if (status === 404) throw error(404, 'SHEETS_FILE_NOT_FOUND');
		if (status === 403) throw error(403, 'SHEETS_NO_PERMISSION');
		throw error(502, 'SHEETS_API_ERROR');
	}

	const existingTabs = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? [];
	if (existingTabs.includes(tabName)) {
		throw error(409, 'TAB_EXISTS');
	}

	// Build row data mirroring the Excel export layout
	const friday = new Date(timesheet.period_start);
	friday.setDate(timesheet.period_start.getDate() + 4);

	const headers = enableStudents
		? ['Day / Date', 'Student Name', 'Time', 'Total Hours', 'Rate', 'Amount', 'Notes', 'Location', 'Paid']
		: ['Day / Date', 'Appointment', 'Time', 'Total Hours', 'Notes', 'Location'];

	const rows: (string | number)[][] = [
		['Personalized Tutoring'],
		[],
		['Employee', tutorName],
		['Week ending:', friday.toLocaleDateString('en-US')],
		[],
		headers,
	];

	const filtered = timesheet.appointments.filter((a) => a.status !== 'cancelled');

	const byDay = new Map<string, typeof filtered>();
	for (const appt of filtered) {
		const key = appt.date.toISOString().split('T')[0];
		if (!byDay.has(key)) byDay.set(key, []);
		byDay.get(key)!.push(appt);
	}

	let totalHours = 0;
	let totalEarnings = 0;

	for (const [dateKey, appts] of byDay) {
		const parts = dateKey.split('-').map(Number);
		const dayIdx = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
		const dayName = DAY_NAMES[dayIdx];
		const dateStr = `${parts[1]}/${parts[2]}`;

		for (let i = 0; i < appts.length; i++) {
			const appt = appts[i];
			const duration = formatDurationHours(appt.start_time, appt.end_time);
			const timeStr = `${fmtTime(appt.start_time)} – ${fmtTime(appt.end_time)}`;
			totalHours += duration;

			// Col A: day name first appt, date second, blank after
			const dayCell = i === 0 ? dayName : i === 1 ? dateStr : '';

			if (enableStudents) {
				const student = appt.matched_student;
				const rate = student ? Number(student.rate_amount) : 0;
				const rateType = student?.rate_type ?? 'hourly';
				const amount = rateType === 'hourly' ? rate * duration : rate;
				totalEarnings += amount;

				rows.push([
					dayCell,
					student ? `${student.first_name} ${student.last_name}` : appt.google_event_title,
					timeStr,
					Math.round(duration * 100) / 100,
					student ? `$${rate}` : '—',
					student ? `$${Math.round(amount * 100) / 100}` : '—',
					appt.notes ?? '',
					appt.location ?? '',
					appt.paid ? 'Yes' : 'No',
				]);
			} else {
				rows.push([
					dayCell,
					appt.google_event_title,
					timeStr,
					Math.round(duration * 100) / 100,
					appt.notes ?? '',
					appt.location ?? '',
				]);
			}
		}
		rows.push([]); // spacer between days
	}

	// Totals row
	const totalsRow: (string | number)[] = enableStudents
		? ['TOTAL', '', '', Math.round(totalHours * 100) / 100, '', `$${Math.round(totalEarnings * 100) / 100}`, '', '', '']
		: ['TOTAL', '', '', Math.round(totalHours * 100) / 100, '', ''];
	rows.push(totalsRow);

	// Add new sheet tab
	try {
		await sheets.spreadsheets.batchUpdate({
			spreadsheetId: settings.google_sheets_file_id,
			requestBody: {
				requests: [{ addSheet: { properties: { title: tabName } } }],
			},
		});
	} catch (e: unknown) {
		const errMsg = (e as { message?: string })?.message ?? '';
		if (errMsg.includes('invalid_grant')) throw error(403, 'MISSING_TOKENS');
		const status = (e as { code?: number })?.code;
		if (status === 403) throw error(403, 'SHEETS_NO_PERMISSION');
		throw error(502, 'SHEETS_API_ERROR');
	}

	// Write data into the new tab
	await sheets.spreadsheets.values.update({
		spreadsheetId: settings.google_sheets_file_id,
		range: `'${tabName}'!A1`,
		valueInputOption: 'USER_ENTERED',
		requestBody: { values: rows },
	});

	return json({ success: true, tabName });
};
