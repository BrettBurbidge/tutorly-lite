import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import ExcelJS from 'exceljs';
import { formatDurationHours } from '$lib/utils';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;

	const timesheet = await prisma.timesheet.findFirst({
		where: { id, tenant_id: tenantId },
		include: {
			appointments: {
				include: {
					matched_student: { include: { parent: true } },
				},
				orderBy: { date: 'asc' },
			},
		},
	});

	if (!timesheet) {
		throw error(404, 'Timesheet not found');
	}

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { display_name: true, enable_students: true },
	});

	const tutorName = settings?.display_name ?? 'Tutor';
	const enableStudents = settings?.enable_students ?? false;

	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet('Timesheet');

	if (enableStudents) {
		sheet.columns = [
			{ header: 'Date', key: 'date', width: 14 },
			{ header: 'Student Name', key: 'student', width: 20 },
			{ header: 'Parent Name', key: 'parent', width: 20 },
			{ header: 'Start Time', key: 'start', width: 12 },
			{ header: 'End Time', key: 'end', width: 12 },
			{ header: 'Duration (hrs)', key: 'duration', width: 14 },
			{ header: 'Status', key: 'status', width: 12 },
			{ header: 'Rate Type', key: 'rateType', width: 12 },
			{ header: 'Rate', key: 'rate', width: 10 },
			{ header: 'Amount', key: 'amount', width: 10 },
			{ header: 'Paid', key: 'paid', width: 8 },
			{ header: 'Notes', key: 'notes', width: 30 },
		];
	} else {
		sheet.columns = [
			{ header: 'Date', key: 'date', width: 14 },
			{ header: 'Appointment', key: 'student', width: 28 },
			{ header: 'Start Time', key: 'start', width: 12 },
			{ header: 'End Time', key: 'end', width: 12 },
			{ header: 'Duration (hrs)', key: 'duration', width: 14 },
			{ header: 'Status', key: 'status', width: 12 },
			{ header: 'Notes', key: 'notes', width: 30 },
		];
	}

	// Style header row
	sheet.getRow(1).font = { bold: true };

	let totalHours = 0;
	let totalEarnings = 0;

	for (const appt of timesheet.appointments) {
		// Cancelled sessions are not billed and not included in the invoice
		if (appt.status === 'cancelled') continue;

		const durationHrs = formatDurationHours(appt.start_time, appt.end_time);
		totalHours += durationHrs;

		if (enableStudents) {
			const student = appt.matched_student;
			const parent = student?.parent;
			const rate = student ? Number(student.rate_amount) : 0;
			const rateType = student?.rate_type ?? 'hourly';
			const amount = rateType === 'hourly' ? rate * durationHrs : rate;
			totalEarnings += amount;

			sheet.addRow({
				date: appt.date.toLocaleDateString('en-US'),
				student: student ? `${student.first_name} ${student.last_name}` : appt.google_event_title,
				parent: parent ? `${parent.first_name} ${parent.last_name}` : '—',
				start: appt.start_time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
				end: appt.end_time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
				duration: Math.round(durationHrs * 100) / 100,
				status: appt.status,
				rateType: student ? rateType : '—',
				rate: student ? rate : '—',
				amount: Math.round(amount * 100) / 100,
				paid: appt.paid ? 'Yes' : 'No',
				notes: appt.notes ?? '',
			});
		} else {
			sheet.addRow({
				date: appt.date.toLocaleDateString('en-US'),
				student: appt.google_event_title,
				start: appt.start_time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
				end: appt.end_time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
				duration: Math.round(durationHrs * 100) / 100,
				status: appt.status,
				notes: appt.notes ?? '',
			});
		}
	}

	// Totals row
	const totalsRow = sheet.addRow(
		enableStudents
			? { date: 'TOTAL', duration: Math.round(totalHours * 100) / 100, amount: Math.round(totalEarnings * 100) / 100 }
			: { date: 'TOTAL', duration: Math.round(totalHours * 100) / 100 }
	);
	totalsRow.font = { bold: true };

	const buffer = await workbook.xlsx.writeBuffer();
	const dateStr = timesheet.period_start.toISOString().split('T')[0];
	const filename = `${tutorName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

	return new Response(new Uint8Array(buffer as ArrayBuffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
