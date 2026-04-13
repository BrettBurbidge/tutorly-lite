import { google } from 'googleapis';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import { prisma } from '$lib/server/prisma';

export function createOAuth2Client() {
	return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
}

/**
 * Returns a googleapis OAuth2Client with credentials set for the given tenant.
 * Wires the `tokens` event to persist refreshed tokens back to the User row.
 * Throws an error with message 'MISSING_TOKENS' if no tokens exist.
 */
export async function getAuthenticatedClient(tenantId: string) {
	const user = await prisma.user.findFirst({
		where: { tenant_id: tenantId, role: 'tutor' },
		select: {
			id: true,
			google_access_token: true,
			google_refresh_token: true,
			google_token_expiry: true,
		},
	});

	if (!user?.google_access_token || !user?.google_refresh_token) {
		throw new Error('MISSING_TOKENS');
	}

	const oauth2Client = createOAuth2Client();
	oauth2Client.setCredentials({
		access_token: user.google_access_token,
		refresh_token: user.google_refresh_token,
		expiry_date: user.google_token_expiry?.getTime() ?? null,
	});

	// Persist any refreshed tokens back to DB
	oauth2Client.on('tokens', async (tokens) => {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				...(tokens.access_token ? { google_access_token: tokens.access_token } : {}),
				...(tokens.expiry_date ? { google_token_expiry: new Date(tokens.expiry_date) } : {}),
			},
		});
	});

	return oauth2Client;
}
