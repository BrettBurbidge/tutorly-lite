import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import ExcelJS from 'exceljs';
import { Resend } from 'resend';
import { formatDurationHours } from '$lib/utils';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { id } = params;

	const timesheet = await prisma.timesheet.findFirst({
		where: { id, tenant_id: tenantId },
		include: {
			appointments: {
				include: { matched_student: { include: { parent: true } } },
				orderBy: { date: 'asc' },
			},
		},
	});

	if (!timesheet) {
		throw error(404, 'Timesheet not found');
	}

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { display_name: true },
	});

	const dbUser = await prisma.user.findFirst({
		where: { tenant_id: tenantId, role: 'tutor' },
		select: { email: true },
	});

	const tutorName = settings?.display_name ?? 'Tutor';
	const tutorEmail = dbUser?.email;

	if (!tutorEmail) {
		throw error(400, 'No email address found for tutor');
	}

	// Build Excel
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet('Timesheet');
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
	];
	sheet.getRow(1).font = { bold: true };

	let totalHours = 0;
	let totalEarnings = 0;
	let sessionCount = 0;

	for (const appt of timesheet.appointments) {
		const student = appt.matched_student;
		const parent = student?.parent;
		const durationHrs = formatDurationHours(appt.start_time, appt.end_time);
		const rate = student ? Number(student.rate_amount) : 0;
		const rateType = student?.rate_type ?? 'hourly';
		const amount = rateType === 'hourly' ? rate * durationHrs : rate;

		totalHours += durationHrs;
		totalEarnings += amount;
		if (appt.status === 'complete') sessionCount++;

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
		});
	}

	const totalsRow = sheet.addRow({
		date: 'TOTAL',
		duration: Math.round(totalHours * 100) / 100,
		amount: Math.round(totalEarnings * 100) / 100,
	});
	totalsRow.font = { bold: true };

	const rawBuffer = await workbook.xlsx.writeBuffer();
	const buffer = Buffer.from(rawBuffer);
	const dateStr = timesheet.period_start.toISOString().split('T')[0];
	const filename = `${tutorName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
	const period = `${timesheet.period_start.toLocaleDateString('en-US')} – ${timesheet.period_end.toLocaleDateString('en-US')}`;

	const { error: sendError } = await resend.emails.send({
		from: RESEND_FROM_EMAIL,
		to: tutorEmail,
		subject: `Timesheet — ${tutorName} — ${period}`,
		html: `
			<p>Hi ${tutorName},</p>
			<p>Your timesheet for <strong>${period}</strong> is attached.</p>
			<ul>
				<li>Sessions completed: ${sessionCount}</li>
				<li>Total hours: ${Math.round(totalHours * 100) / 100}</li>
				<li>Estimated earnings: $${Math.round(totalEarnings * 100) / 100}</li>
			</ul>
			<p>This email was sent only to you. No third parties received this timesheet.</p>
		`,
		attachments: [
			{
				filename,
				content: buffer.toString('base64'),
			},
		],
	});

	if (sendError) {
		console.error('Resend error:', sendError);
		throw error(500, 'Failed to send email');
	}

	return json({ success: true });
};
