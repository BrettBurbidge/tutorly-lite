import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import Fuse from 'fuse.js';
import { normalizeEventTitle } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const { eventTitle } = (await request.json()) as { eventTitle: string };

	if (!eventTitle) {
		throw error(400, 'eventTitle is required');
	}

	const normalized = normalizeEventTitle(eventTitle);

	// Check cache first
	const cached = await prisma.nameMatchCache.findUnique({
		where: { normalized_event_title_tenant_id: { normalized_event_title: normalized, tenant_id: tenantId } },
		include: { matched_student: true },
	});

	if (cached) {
		return json({ matchedStudentId: cached.matched_student_id, source: 'cache' });
	}

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { fuzzy_match_threshold: true },
	});

	const threshold = settings?.fuzzy_match_threshold ?? 0.6;

	const students = await prisma.student.findMany({
		where: { tenant_id: tenantId },
		select: { id: true, first_name: true, last_name: true },
	});

	if (students.length === 0) {
		return json({ matchedStudentId: null, source: 'no_students' });
	}

	type SearchTarget = { id: string; name: string };
	type StudentRow = { id: string; first_name: string; last_name: string };

	const searchTargets: SearchTarget[] = (students as StudentRow[]).flatMap((s) => [
		{ id: s.id, name: s.first_name },
		{ id: s.id, name: s.last_name },
		{ id: s.id, name: `${s.first_name} ${s.last_name}` },
	]);

	const fuse = new Fuse<SearchTarget>(searchTargets, {
		keys: ['name'],
		threshold: 1 - threshold, // Fuse uses distance (0=exact), PRD uses similarity
		includeScore: true,
	});

	const results = fuse.search(normalized);

	if (results.length === 0) {
		return json({ matchedStudentId: null, source: 'no_match' });
	}

	// Group by student id, take best score
	const byStudent = new Map<string, number>();
	for (const r of results) {
		const score = r.score ?? 1;
		const item = r.item as SearchTarget;
		const existing = byStudent.get(item.id) ?? 1;
		byStudent.set(item.id, Math.min(score, existing));
	}

	const sorted = [...byStudent.entries()].sort((a, b) => a[1] - b[1]);

	// Ambiguous if top two scores are very close
	if (sorted.length >= 2 && sorted[1][1] - sorted[0][1] < 0.1) {
		return json({ matchedStudentId: null, source: 'ambiguous' });
	}

	return json({ matchedStudentId: sorted[0][0], source: 'fuzzy' });
};
