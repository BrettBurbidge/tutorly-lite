import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import ExcelJS from 'exceljs';
import { formatDurationHours } from '$lib/utils';

const HEADER_BG    = 'FF6B8FA8'; // steel blue header
const HEADER_FG    = 'FFFFFFFF'; // white text
const TITLE_COLOR  = 'FF4472C4'; // MS blue
const LABEL_COLOR  = 'FF4472C4';
const TOTALS_BG    = 'FFD9E1F2'; // light blue tint
const BORDER_COLOR = 'FFD0D0D0';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtTime(d: Date) {
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(d: Date) {
	return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function styleHeader(cell: ExcelJS.Cell, value: string) {
	cell.value = value;
	cell.font = { bold: true, color: { argb: HEADER_FG }, size: 11 };
	cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
	cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
	cell.border = {
		top:    { style: 'thin', color: { argb: 'FFFFFFFF' } },
		left:   { style: 'thin', color: { argb: 'FFFFFFFF' } },
		bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
		right:  { style: 'thin', color: { argb: 'FFFFFFFF' } },
	};
}

function styleDataRow(row: ExcelJS.Row) {
	row.height = 18;
	row.eachCell({ includeEmpty: true }, (cell) => {
		cell.border = { bottom: { style: 'hair', color: { argb: BORDER_COLOR } } };
	});
}

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
				include: { matched_student: { include: { parent: true } } },
				orderBy: { date: 'asc' },
			},
		},
	});

	if (!timesheet) throw error(404, 'Timesheet not found');

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { display_name: true, enable_students: true },
	});

	const tutorName     = settings?.display_name ?? 'Tutor';
	const enableStudents = settings?.enable_students ?? false;

	// Friday of the period week (period_start = Monday)
	const periodStart = timesheet.period_start;
	const periodEnd   = timesheet.period_end;
	const friday      = new Date(periodStart);
	friday.setDate(periodStart.getDate() + 4);

	// Sheet tab name
	const shortDate = (d: Date) =>
		`${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
	const tabName = `${shortDate(periodStart)} to ${shortDate(periodEnd)}`;

	// Column layout
	const numCols = enableStudents ? 9 : 6;
	const lastCol  = String.fromCharCode(64 + numCols); // A=65

	const workbook = new ExcelJS.Workbook();
	const sheet    = workbook.addWorksheet(tabName);

	if (enableStudents) {
		sheet.columns = [
			{ key: 'a', width: 16 }, // Day / Date
			{ key: 'b', width: 24 }, // Student Name
			{ key: 'c', width: 18 }, // Time
			{ key: 'd', width: 13 }, // Hours
			{ key: 'e', width: 10 }, // Rate
			{ key: 'f', width: 10 }, // Amount
			{ key: 'g', width: 22 }, // Location
			{ key: 'h', width: 32 }, // Notes
			{ key: 'i', width: 8  }, // Paid
		];
	} else {
		sheet.columns = [
			{ key: 'a', width: 16 }, // Day / Date
			{ key: 'b', width: 30 }, // Appointment
			{ key: 'c', width: 18 }, // Time
			{ key: 'd', width: 13 }, // Hours
			{ key: 'e', width: 22 }, // Location
			{ key: 'f', width: 32 }, // Notes
		];
	}

	// ── Row 1: Title ─────────────────────────────────────────
	sheet.mergeCells(`A1:${lastCol}1`);
	const titleCell = sheet.getCell('A1');
	titleCell.value = 'Personalized Tutoring';
	titleCell.font  = { size: 22, color: { argb: TITLE_COLOR } };
	titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
	sheet.getRow(1).height = 36;

	// ── Rows 2-3: spacer ─────────────────────────────────────
	sheet.getRow(2).height = 4;
	sheet.getRow(3).height = 4;

	// ── Row 4: Employee ──────────────────────────────────────
	const eLabel = sheet.getCell('A4');
	eLabel.value = 'Employee';
	eLabel.font  = { color: { argb: LABEL_COLOR } };
	const eValue = sheet.getCell('B4');
	eValue.value = tutorName;
	eValue.font  = { bold: true };
	sheet.getRow(4).height = 18;

	// ── Row 5: Week ending ───────────────────────────────────
	const wLabel = sheet.getCell('A5');
	wLabel.value = 'Week ending:';
	wLabel.font  = { color: { argb: LABEL_COLOR } };
	const wValue = sheet.getCell('B5');
	wValue.value = fmtDate(friday);
	wValue.font  = { bold: true };
	sheet.getRow(5).height = 18;

	// ── Row 6: spacer ────────────────────────────────────────
	sheet.getRow(6).height = 8;

	// ── Row 7: Column headers ────────────────────────────────
	sheet.getRow(7).height = 36;
	if (enableStudents) {
		styleHeader(sheet.getCell('A7'), 'Day / Date');
		styleHeader(sheet.getCell('B7'), 'Student Name');
		styleHeader(sheet.getCell('C7'), 'Time');
		styleHeader(sheet.getCell('D7'), 'Total Hours');
		styleHeader(sheet.getCell('E7'), 'Rate');
		styleHeader(sheet.getCell('F7'), 'Amount');
		styleHeader(sheet.getCell('G7'), 'Location');
		styleHeader(sheet.getCell('H7'), 'Notes');
		styleHeader(sheet.getCell('I7'), 'Paid');
	} else {
		styleHeader(sheet.getCell('A7'), 'Day / Date');
		styleHeader(sheet.getCell('B7'), 'Appointment');
		styleHeader(sheet.getCell('C7'), 'Time');
		styleHeader(sheet.getCell('D7'), 'Total Hours');
		styleHeader(sheet.getCell('E7'), 'Location');
		styleHeader(sheet.getCell('F7'), 'Notes');
	}

	// ── Data rows (grouped by day) ───────────────────────────
	// Skip cancelled
	const filtered = timesheet.appointments.filter(a => a.status !== 'cancelled');

	// Group by date (ISO date key)
	const byDay = new Map<string, typeof filtered>();
	for (const appt of filtered) {
		const key = appt.date.toISOString().split('T')[0];
		if (!byDay.has(key)) byDay.set(key, []);
		byDay.get(key)!.push(appt);
	}

	let rowIdx      = 8;
	let totalHours  = 0;
	let totalEarnings = 0;

	for (const [dateKey, appts] of byDay) {
		// Parse date safely using UTC parts (Prisma stores @db.Date as midnight UTC)
		const parts   = dateKey.split('-').map(Number);
		const dayIdx  = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay();
		const dayName = DAY_NAMES[dayIdx];
		const dateStr = `${parts[1]}/${parts[2]}`;

		for (let i = 0; i < appts.length; i++) {
			const appt     = appts[i];
			const duration = formatDurationHours(appt.start_time, appt.end_time);
			const timeStr  = `${fmtTime(appt.start_time)} – ${fmtTime(appt.end_time)}`;
			totalHours    += duration;

			const row = sheet.getRow(rowIdx++);
			styleDataRow(row);

			// Col A: day name on first appt of day, date on second, blank after
			if (i === 0) {
				row.getCell(1).value = dayName;
				row.getCell(1).font  = { bold: true };
				row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
			} else if (i === 1) {
				row.getCell(1).value = dateStr;
				row.getCell(1).font  = { color: { argb: 'FF888888' }, italic: true, size: 10 };
				row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
			}

			if (enableStudents) {
				const student  = appt.matched_student;
				const rate     = student ? Number(student.rate_amount) : 0;
				const rateType = student?.rate_type ?? 'hourly';
				const amount   = rateType === 'hourly' ? rate * duration : rate;
				totalEarnings += amount;

				row.getCell(2).value = student
					? `${student.first_name} ${student.last_name}`
					: appt.google_event_title;
				row.getCell(3).value = timeStr;
				row.getCell(4).value = Math.round(duration * 100) / 100;
				row.getCell(4).alignment = { horizontal: 'center' };
				row.getCell(5).value = student ? `$${rate}` : '—';
				row.getCell(5).alignment = { horizontal: 'center' };
				row.getCell(6).value = student ? `$${Math.round(amount * 100) / 100}` : '—';
				row.getCell(6).alignment = { horizontal: 'center' };
				row.getCell(7).value = appt.location ?? '';
				row.getCell(8).value = appt.notes ?? '';
				row.getCell(9).value = appt.paid ? 'Yes' : 'No';
				row.getCell(9).alignment = { horizontal: 'center' };
			} else {
				row.getCell(2).value = appt.google_event_title;
				row.getCell(3).value = timeStr;
				row.getCell(4).value = Math.round(duration * 100) / 100;
				row.getCell(4).alignment = { horizontal: 'center' };
				row.getCell(5).value = appt.location ?? '';
				row.getCell(6).value = appt.notes ?? '';
			}
		}

		// Spacer row between days
		const spacer = sheet.getRow(rowIdx++);
		spacer.height = 6;
	}

	// ── Totals row ───────────────────────────────────────────
	const totalsRow = sheet.getRow(rowIdx);
	totalsRow.height = 22;

	for (let c = 1; c <= numCols; c++) {
		totalsRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTALS_BG } };
	}

	totalsRow.getCell(1).value = 'TOTAL';
	totalsRow.getCell(1).font  = { bold: true };
	totalsRow.getCell(1).alignment = { horizontal: 'center' };
	totalsRow.getCell(4).value = Math.round(totalHours * 100) / 100;
	totalsRow.getCell(4).font  = { bold: true };
	totalsRow.getCell(4).alignment = { horizontal: 'center' };

	if (enableStudents) {
		totalsRow.getCell(6).value = `$${Math.round(totalEarnings * 100) / 100}`;
		totalsRow.getCell(6).font  = { bold: true };
		totalsRow.getCell(6).alignment = { horizontal: 'center' };
	}

	// Freeze header rows
	sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

	// Print settings
	sheet.pageSetup = {
		paperSize: 1, // Letter
		orientation: 'portrait',
		fitToPage: true,
		fitToWidth: 1,
		fitToHeight: 0,
		margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
	};

	const buffer   = await workbook.xlsx.writeBuffer();
	const filename = `${tutorName.replace(/\s+/g, '_')}_${periodStart.toISOString().split('T')[0]}.xlsx`;

	return new Response(new Uint8Array(buffer as ArrayBuffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
