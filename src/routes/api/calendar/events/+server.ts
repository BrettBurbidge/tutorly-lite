import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function fetchWithRefresh(
	accessToken: string,
	refreshToken: string,
	userId: string,
	url: string
): Promise<{ data: unknown; newAccessToken?: string }> {
	let res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (res.status === 401 && refreshToken) {
		// Try to refresh
		const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			}),
		});

		if (!refreshRes.ok) {
			return { data: null }; // Refresh failed — caller handles reconnect prompt
		}

		const refreshData = (await refreshRes.json()) as { access_token: string };
		const newToken = refreshData.access_token;

		// Persist new token
		await prisma.user.update({
			where: { supabase_uid: userId },
			data: { google_access_token: newToken },
		});

		res = await fetch(url, {
			headers: { Authorization: `Bearer ${newToken}` },
		});

		return { data: await res.json(), newAccessToken: newToken };
	}

	return { data: await res.json() };
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session || locals.role !== 'tutor') {
		throw error(401, 'Unauthorized');
	}

	const tenantId = locals.tenantId!;
	const timeMin = url.searchParams.get('timeMin');
	const timeMax = url.searchParams.get('timeMax');

	if (!timeMin || !timeMax) {
		throw error(400, 'timeMin and timeMax are required');
	}

	const dbUser = await prisma.user.findUnique({
		where: { supabase_uid: locals.user!.id },
		select: { google_access_token: true, google_refresh_token: true },
	});

	if (!dbUser?.google_access_token) {
		return json({ events: [], reconnectRequired: true });
	}

	const settings = await prisma.tutorSettings.findUnique({
		where: { tenant_id: tenantId },
		select: { calendar_color_filter: true },
	});

	const colorFilter = settings?.calendar_color_filter ?? '11';

	const calendarUrl =
		`${GOOGLE_CALENDAR_API}/calendars/primary/events?` +
		new URLSearchParams({
			timeMin,
			timeMax,
			singleEvents: 'true',
			orderBy: 'startTime',
			maxResults: '500',
		});

	const { data, newAccessToken } = await fetchWithRefresh(
		dbUser.google_access_token,
		dbUser.google_refresh_token ?? '',
		locals.user!.id,
		calendarUrl
	);

	if (!data) {
		return json({ events: [], reconnectRequired: true });
	}

	const calData = data as { items?: GoogleCalendarEvent[] };

	// Filter to only red (colorId 11 / Tomato) events, or the configured color
	const filtered = (calData.items ?? []).filter((ev) => {
		const colorId = ev.colorId ?? ev.eventType;
		return colorId === colorFilter;
	});

	return json({ events: filtered, reconnectRequired: false, newAccessToken });
};

interface GoogleCalendarEvent {
	id: string;
	summary?: string;
	location?: string;
	colorId?: string;
	eventType?: string;
	status?: string;
	start: { dateTime?: string; date?: string };
	end: { dateTime?: string; date?: string };
}
