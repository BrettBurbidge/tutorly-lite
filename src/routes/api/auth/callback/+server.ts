import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { createSupabaseAdminClient } from '$lib/server/supabase';
import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/portal';

	if (!code) {
		throw error(400, 'Missing OAuth code');
	}

	const { data, error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);

	if (exchangeError || !data.user) {
		console.error('OAuth exchange error:', exchangeError);
		throw redirect(303, '/login?error=oauth_failed');
	}

	const { user, session } = data;

	// Check if user record already exists
	const existingUser = await prisma.user.findUnique({
		where: { supabase_uid: user.id },
	});

	if (existingUser) {
		// Returning user — update tokens if provided
		console.log('[auth/callback] provider_token present:', !!session.provider_token, '| refresh_token present:', !!session.provider_refresh_token);
		const providerTokens = session.provider_token
			? {
					google_access_token: session.provider_token,
					google_refresh_token: session.provider_refresh_token ?? existingUser.google_refresh_token,
				}
			: {};

		if (Object.keys(providerTokens).length > 0) {
			await prisma.user.update({
				where: { id: existingUser.id },
				data: providerTokens,
			});
		}

		// Ensure role + tenant_id are in app_metadata
		await createSupabaseAdminClient()
			.auth.admin.updateUserById(user.id, {
				app_metadata: {
					role: existingUser.role,
					tenant_id: existingUser.tenant_id,
				},
			})
			.catch(() => {});

		throw redirect(303, '/portal');
	}

	// New user — determine if this is a super_admin login (email+password, no provider token)
	const isSuperAdmin = !session.provider_token;

	if (isSuperAdmin) {
		// Super-admin login via email+password — just redirect, user must exist already
		throw redirect(303, '/superadmin/dashboard');
	}

	// New tutor — create Tenant + User + TutorSettings atomically
	const displayName =
		user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Tutor';
	const email = user.email!;

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await prisma.$transaction(async (tx: any) => {
			const tenant = await tx.tenant.create({
				data: { status: 'active' },
			});

			const newUser = await tx.user.create({
				data: {
					tenant_id: tenant.id,
					email,
					role: 'tutor',
					supabase_uid: user.id,
					display_name: displayName,
					google_access_token: session.provider_token ?? null,
					google_refresh_token: session.provider_refresh_token ?? null,
				},
			});

			await tx.tutorSettings.create({
				data: {
					tenant_id: tenant.id,
					display_name: displayName,
					calendar_color_filter: '11',
					fuzzy_match_threshold: 0.6,
				},
			});

			return { tenant, user: newUser };
		});

		// Store role + tenant_id in Supabase app_metadata (best-effort)
		await createSupabaseAdminClient()
			.auth.admin.updateUserById(user.id, {
				app_metadata: {
					role: 'tutor',
					tenant_id: result.tenant.id,
				},
			})
			.catch(() => {});

		// Send welcome email (best-effort)
		await resend.emails
			.send({
				from: RESEND_FROM_EMAIL,
				to: email,
				subject: 'Welcome to TutorTimeCard Lite!',
				html: `<p>Hi ${displayName},</p><p>Your TutorTimeCard Lite workspace is ready. <a href="${url.origin}/portal">Sign in to your portal</a> to get started.</p>`,
			})
			.catch((err) => console.error('Welcome email failed:', err));
	} catch (err) {
		console.error('Tenant creation failed:', err);
		// Sign out to avoid a broken session state
		await locals.supabase.auth.signOut();
		throw redirect(303, '/login?error=signup_failed');
	}

	throw redirect(303, '/portal');
};
