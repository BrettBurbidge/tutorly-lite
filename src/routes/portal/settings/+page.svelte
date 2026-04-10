<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { data } = $props();

	const supabase = createSupabaseBrowserClient();

	let displayName = $state(untrack(() => data.settings?.display_name ?? ''));
	let colorFilter = $state(untrack(() => data.settings?.calendar_color_filter ?? '11'));
	let threshold = $state(untrack(() => data.settings?.fuzzy_match_threshold ?? 0.6));
	let enableStudents = $state(untrack(() => data.settings?.enable_students ?? false));
	let saving = $state(false);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	const colorOptions = [
		{ value: '11', label: 'Tomato (Red) — default' },
		{ value: '1', label: 'Lavender' },
		{ value: '2', label: 'Sage' },
		{ value: '3', label: 'Grape' },
		{ value: '4', label: 'Flamingo' },
		{ value: '5', label: 'Banana' },
		{ value: '6', label: 'Tangerine' },
		{ value: '7', label: 'Peacock' },
		{ value: '8', label: 'Graphite' },
		{ value: '9', label: 'Blueberry' },
		{ value: '10', label: 'Basil' },
	];

	const thresholdLabel = $derived(() => {
		if (threshold >= 0.8) return 'Very strict — only very close matches';
		if (threshold >= 0.6) return 'Moderate — balanced accuracy (recommended)';
		if (threshold >= 0.4) return 'Lenient — catches more but may have false matches';
		return 'Very lenient — many potential false matches';
	});

	async function saveSettings() {
		saving = true;
		const res = await fetch('/api/portal/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				display_name: displayName,
				calendar_color_filter: colorFilter,
				fuzzy_match_threshold: threshold,
				enable_students: enableStudents,
			}),
		});

		if (res.ok) {
			toast = { message: 'Settings saved.', type: 'success' };
			await invalidateAll();
		} else {
			toast = { message: 'Failed to save settings.', type: 'error' };
		}
		saving = false;
	}

	async function reconnectGoogle() {
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

<h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

<div class="space-y-6 max-w-lg">
	<!-- Google account -->
	<section class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900 mb-3">Google Account</h2>
		<div class="flex items-center gap-3 mb-4">
			<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
				{data.googleDisplayName.charAt(0).toUpperCase()}
			</div>
			<div>
				<p class="font-medium text-gray-900">{data.googleDisplayName}</p>
				<p class="text-sm text-gray-500">{data.email}</p>
			</div>
		</div>
		<Button variant="outline" size="sm" onclick={reconnectGoogle}>
			Reconnect Google Calendar
		</Button>
	</section>

	<!-- Display name -->
	<section class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900 mb-3">Display Name</h2>
		<p class="text-sm text-gray-500 mb-3">Used on Excel exports and email subjects.</p>
		<Input bind:value={displayName} placeholder="Your name" />
	</section>

	<!-- Calendar color -->
	<section class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900 mb-3">Calendar Color Filter</h2>
		<p class="text-sm text-gray-500 mb-3">
			Only calendar events with this color will be imported as tutoring appointments.
		</p>
		<Select options={colorOptions} bind:value={colorFilter} />
	</section>

	<!-- Fuzzy match -->
	<section class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900 mb-3">Name Matching Sensitivity</h2>
		<p class="text-sm text-gray-500 mb-3">
			Controls how closely a calendar event title must match a student's name. Higher = stricter matching.
		</p>
		<input
			type="range"
			min="0.1"
			max="0.95"
			step="0.05"
			bind:value={threshold}
			class="w-full accent-blue-600"
		/>
		<div class="flex justify-between text-xs text-gray-400 mt-1">
			<span>Lenient</span>
			<span class="text-center text-blue-600 font-medium">{threshold.toFixed(2)} — {thresholdLabel()}</span>
			<span>Strict</span>
		</div>
	</section>

	<!-- Feature flags -->
	<section class="bg-white rounded-xl border border-gray-200 p-5">
		<h2 class="font-semibold text-gray-900 mb-1">System Features</h2>
		<p class="text-sm text-gray-500 mb-4">Enable or disable optional features for your workflow.</p>
		<label class="flex items-center justify-between gap-4 cursor-pointer">
			<div>
				<p class="text-sm font-medium text-gray-800">Enable Students</p>
				<p class="text-xs text-gray-500 mt-0.5">Match appointments to students, track rates and parents, and include billing details on invoices.</p>
			</div>
			<button
				role="switch"
				aria-checked={enableStudents}
				aria-label="Enable Students"
				onclick={() => (enableStudents = !enableStudents)}
				class={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enableStudents ? 'bg-blue-600' : 'bg-gray-200'}`}
			>
				<span class={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enableStudents ? 'translate-x-5' : 'translate-x-0'}`}></span>
			</button>
		</label>
	</section>

	<Button onclick={saveSettings} disabled={saving} size="lg">
		{saving ? 'Saving…' : 'Save Settings'}
	</Button>
</div>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
