<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';

	const supabase = createSupabaseBrowserClient();

	async function signInWithGoogle() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/api/auth/callback`,
				scopes: 'https://www.googleapis.com/auth/calendar.readonly',
				queryParams: { access_type: 'offline', prompt: 'consent' },
			},
		});
	}
</script>

<div style="background-color: #1D3557; color: #F1FAEE;" class="min-h-screen flex flex-col">

	<!-- Nav -->
	<header class="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto w-full">
		<div class="flex items-center gap-3">
			<img src="/logo.png" alt="Tutorly" class="w-9 h-9 rounded-xl" />
			<span class="text-xl font-bold tracking-tight" style="color: #F1FAEE;">Tutorly</span>
		</div>
		<button
			onclick={signInWithGoogle}
			class="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
			style="color: #A8DADC; border: 1.5px solid #457B9D;"
			onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#457B9D22'; }}
			onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
		>
			Sign in
		</button>
	</header>

	<!-- Hero -->
	<main class="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
		<div class="max-w-3xl mx-auto">

			<!-- Logo mark -->
			<div class="flex justify-center mb-8">
				<img src="/logo.png" alt="Tutorly logo" class="w-24 h-24 rounded-3xl shadow-2xl" />
			</div>

			<h1 class="text-5xl sm:text-6xl font-extrabold leading-tight mb-6" style="color: #F1FAEE;">
				Tutoring time tracking,<br/>
				<span style="color: #A8DADC;">on autopilot.</span>
			</h1>

			<p class="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style="color: #A8DADC;">
				Track your tutoring sessions and hours with ease. Tutorly connects to your calendar to log time automatically, so you can focus on teaching and get paid accurately.
			</p>

			<!-- Primary CTA -->
			<button
				onclick={signInWithGoogle}
				class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold shadow-lg transition-all hover:scale-105 active:scale-100"
				style="background-color: #E63946; color: #F1FAEE;"
				onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c72d3a'; }}
				onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E63946'; }}
			>
				<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
					<path fill="#ffffff" fill-opacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				Get started with Google
			</button>

			<p class="mt-4 text-sm" style="color: #457B9D;">Free to use · No credit card required</p>
		</div>
	</main>

	<!-- Features -->
	<section class="py-20 px-6" style="background-color: #162840;">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-2xl font-bold text-center mb-12" style="color: #F1FAEE;">Everything you need to run your tutoring practice</h2>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-8">

				<div class="rounded-2xl p-6" style="background-color: #1D3557; border: 1px solid #457B9D33;">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl" style="background-color: #457B9D22;">📅</div>
					<h3 class="font-semibold mb-2" style="color: #F1FAEE;">Calendar sync</h3>
					<p class="text-sm leading-relaxed" style="color: #A8DADC;">Connect your Google Calendar and Tutorly automatically pulls in your tutoring appointments — no manual entry.</p>
				</div>

				<div class="rounded-2xl p-6" style="background-color: #1D3557; border: 1px solid #457B9D33;">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl" style="background-color: #457B9D22;">⏱</div>
					<h3 class="font-semibold mb-2" style="color: #F1FAEE;">Accurate time tracking</h3>
					<p class="text-sm leading-relaxed" style="color: #A8DADC;">Sessions are logged to the minute. Mark complete, no-show, or cancelled — and add notes right on the card.</p>
				</div>

				<div class="rounded-2xl p-6" style="background-color: #1D3557; border: 1px solid #457B9D33;">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl" style="background-color: #457B9D22;">📊</div>
					<h3 class="font-semibold mb-2" style="color: #F1FAEE;">Instant timesheets</h3>
					<p class="text-sm leading-relaxed" style="color: #A8DADC;">Confirm your week and download a formatted Excel timesheet — ready to hand off or file for yourself.</p>
				</div>

			</div>
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="py-20 px-6 text-center" style="background-color: #1D3557;">
		<div class="max-w-xl mx-auto">
			<h2 class="text-3xl font-bold mb-4" style="color: #F1FAEE;">Ready to simplify your schedule?</h2>
			<p class="mb-8" style="color: #A8DADC;">Join tutors who spend less time on admin and more time teaching.</p>
			<button
				onclick={signInWithGoogle}
				class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-semibold shadow-lg transition-all hover:scale-105 active:scale-100"
				style="background-color: #E63946; color: #F1FAEE;"
				onmouseenter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c72d3a'; }}
				onmouseleave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E63946'; }}
			>
				<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
					<path fill="#ffffff" fill-opacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
					<path fill="#ffffff" fill-opacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
				</svg>
				Get started with Google
			</button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="py-6 text-center text-xs" style="background-color: #162840; color: #457B9D;">
		<p>© {new Date().getFullYear()} Tutorly · <a href="/login" class="hover:underline" style="color: #457B9D;">Admin login</a></p>
	</footer>

</div>
