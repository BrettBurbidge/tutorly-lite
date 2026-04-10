<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import AppointmentCard from '$lib/components/AppointmentCard.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { formatDate, formatDurationHours } from '$lib/utils';

	let { data } = $props();

	const enableStudents = untrack(() => data.enableStudents as boolean);

	// View state — week-only when students disabled
	let viewMode = $state<'day' | 'week'>(enableStudents ? 'day' : 'week');
	let selectedDate = $state(new Date());
	let appointments = $state<Appointment[]>([]);
	let loading = $state(false);
	let reconnectRequired = $state(false);
	let toast = $state<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

	// Resolution dialog
	let showResolution = $state(false);
	let resolutionMap = $state<Record<string, string>>({});

	// Confirm dialog
	let showConfirm = $state(false);
	let confirming = $state(false);

	interface Appointment {
		id: string;
		google_event_id: string;
		google_event_title: string;
		date: string;
		start_time: string;
		end_time: string;
		status: 'default' | 'complete' | 'cancelled' | 'no_show';
		paid: boolean;
		locked: boolean;
		notes?: string | null;
		matched_student_id: string | null;
		matched_student?: { id: string; first_name: string; last_name: string; rate_type: string; rate_amount: string | number } | null;
	}

	function getWeekRange(date: Date) {
		const d = new Date(date);
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(d.setDate(diff));
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		return { start: monday, end: sunday };
	}

	function getTimeRange() {
		if (viewMode === 'day') {
			const start = new Date(selectedDate);
			start.setHours(0, 0, 0, 0);
			const end = new Date(selectedDate);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		} else {
			return getWeekRange(selectedDate);
		}
	}

	async function fetchAndMerge() {
		loading = true;
		const { start, end } = getTimeRange();

		// Fetch calendar events
		const calRes = await fetch(
			`/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
		);
		const calData = await calRes.json() as { events: CalendarEvent[]; reconnectRequired: boolean };

		reconnectRequired = calData.reconnectRequired;

		if (!calData.events) {
			loading = false;
			return;
		}

		// For each event, upsert into local state after fuzzy matching
		const merged: Appointment[] = [];

		for (const ev of calData.events) {
			// Check if we already have a local record
			const existing = appointments.find((a) => a.google_event_id === ev.id);
			if (existing) {
				merged.push(existing);
				continue;
			}

			// Fuzzy match (only when students feature is enabled)
			let matchedStudentId: string | null = null;
			if (enableStudents) {
				const matchRes = await fetch('/api/calendar/match', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ eventTitle: ev.summary ?? '' }),
				});
				if (matchRes.ok) {
					const matchData = await matchRes.json() as { matchedStudentId: string | null };
					matchedStudentId = matchData.matchedStudentId;
				}
			}

			const student = matchedStudentId
				? (data.students as unknown as {id:string;first_name:string;last_name:string;rate_type:string;rate_amount:string|number}[]).find((s) => s.id === matchedStudentId)
				: null;

			// Upsert appointment status in DB via status API
			const apptRes = await fetch('/api/appointments/upsert', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					google_event_id: ev.id,
					google_event_title: ev.summary ?? '(no title)',
					date: ev.start.dateTime ?? ev.start.date,
					start_time: ev.start.dateTime ?? ev.start.date,
					end_time: ev.end.dateTime ?? ev.end.date,
					matched_student_id: matchedStudentId,
					status: ev.status === 'cancelled' ? 'cancelled' : 'complete',
				}),
			});

			if (apptRes.ok) {
				const saved = await apptRes.json() as Appointment;
				merged.push({ ...saved, matched_student: student ?? null });
			}
		}

		// Sort by start time
		merged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
		appointments = merged;
		loading = false;
	}

	onMount(fetchAndMerge);

	// Watch for date/view changes
	$effect(() => {
		selectedDate;
		viewMode;
		fetchAndMerge();
	});

	function navigate(direction: -1 | 1) {
		const d = new Date(selectedDate);
		if (viewMode === 'day') {
			d.setDate(d.getDate() + direction);
		} else {
			d.setDate(d.getDate() + direction * 7);
		}
		selectedDate = d;
	}

	async function handleStatusChange(id: string, status: Appointment['status']) {
		const res = await fetch(`/api/appointments/${id}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status }),
		});
		if (res.ok) {
			appointments = appointments.map((a) => (a.id === id ? { ...a, status } : a));
		}
	}

	async function handleMatch(id: string, studentId: string) {
		const res = await fetch(`/api/appointments/${id}/match`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ studentId }),
		});
		if (res.ok) {
			const student = (data.students as unknown as {id:string;first_name:string;last_name:string;rate_type:string;rate_amount:string|number}[]).find((s) => s.id === studentId);
			appointments = appointments.map((a) =>
				a.id === id ? { ...a, matched_student_id: studentId, matched_student: student ?? null } : a
			);
		}
	}

	async function handleNotesChange(id: string, notes: string | null) {
		const res = await fetch(`/api/appointments/${id}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ notes }),
		});
		if (res.ok) {
			appointments = appointments.map((a) => (a.id === id ? { ...a, notes } : a));
		}
	}

	async function handlePaidToggle(id: string, paid: boolean) {
		const res = await fetch(`/api/appointments/${id}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ paid }),
		});
		if (res.ok) {
			appointments = appointments.map((a) => (a.id === id ? { ...a, paid } : a));
		}
	}

	// Determine unresolved unmatched appointments (complete or no_show, no student)
	const unresolvedUnmatched = $derived(
		appointments.filter(
			(a) => !a.locked && !a.matched_student_id && (a.status === 'complete' || a.status === 'no_show')
		)
	);

	function startConfirm() {
		if (enableStudents && unresolvedUnmatched.length > 0) {
			resolutionMap = {};
			showResolution = true;
		} else {
			showConfirm = true;
		}
	}

	async function saveResolutions() {
		for (const [apptId, studentId] of Object.entries(resolutionMap)) {
			if (!studentId) continue;
			await fetch(`/api/appointments/${apptId}/match`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId }),
			});
			const student = (data.students as unknown as {id:string;first_name:string;last_name:string;rate_type:string;rate_amount:string|number}[]).find((s) => s.id === studentId);
			appointments = appointments.map((a) =>
				a.id === apptId ? { ...a, matched_student_id: studentId, matched_student: student ?? null } : a
			);
		}
		showResolution = false;
		showConfirm = true;
	}

	const unlocked = $derived(appointments.filter((a) => !a.locked));
	const totalHours = $derived(
		unlocked.filter((a) => a.status !== 'cancelled').reduce((sum, a) => sum + formatDurationHours(a.start_time, a.end_time), 0)
	);
	const totalEarnings = $derived(
		unlocked.filter((a) => a.status !== 'cancelled').reduce((sum, a) => {
			if (!a.matched_student) return sum;
			const rate = Number(a.matched_student.rate_amount);
			const hrs = formatDurationHours(a.start_time, a.end_time);
			return sum + (a.matched_student.rate_type === 'hourly' ? rate * hrs : rate);
		}, 0)
	);

	async function confirmPeriod() {
		confirming = true;
		const { start, end } = getTimeRange();

		const res = await fetch('/api/timesheets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				appointmentIds: unlocked.map((a) => a.id),
				periodStart: start.toISOString().split('T')[0],
				periodEnd: end.toISOString().split('T')[0],
				periodType: viewMode,
			}),
		});

		if (res.ok) {
			const ts = await res.json() as { id: string };
			showConfirm = false;
			toast = { message: 'Period confirmed!', type: 'success' };
			appointments = appointments.map((a) => ({ ...a, locked: true }));

			// Trigger download
			window.location.href = `/api/timesheets/${ts.id}/export`;
		} else {
			const err = await res.json() as { message?: string };
			toast = { message: err.message ?? 'Failed to confirm', type: 'error' };
		}
		confirming = false;
	}

	// Day groupings for week view
	const weekDays = $derived(() => {
		if (viewMode !== 'week') return [];
		const { start } = getWeekRange(selectedDate);
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			return {
				date: d,
				label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
				appts: appointments.filter(
					(a) => new Date(a.date).toDateString() === d.toDateString()
				),
			};
		});
	});

	interface CalendarEvent {
		id: string;
		summary?: string;
		status?: string;
		start: { dateTime?: string; date?: string };
		end: { dateTime?: string; date?: string };
	}
</script>

<!-- Reconnect banner -->
{#if reconnectRequired}
	<div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
		<span>⚠️</span>
		<span>Google Calendar access needs to be reconnected. <a href="/portal/settings" class="underline font-medium">Reconnect in Settings</a></span>
	</div>
{/if}

<!-- Header -->
<div class="flex items-center justify-between mb-6 flex-wrap gap-3">
	<div class="flex items-center gap-2">
		<button onclick={() => navigate(-1)} class="p-2 rounded-lg hover:bg-gray-200 transition-colors" aria-label="Previous">←</button>
		<button onclick={() => (selectedDate = new Date())} class="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium">Today</button>
		<button onclick={() => navigate(1)} class="p-2 rounded-lg hover:bg-gray-200 transition-colors" aria-label="Next">→</button>
		<h1 class="text-lg font-semibold text-gray-900 ml-2">
			{viewMode === 'day' ? formatDate(selectedDate) : (() => {
				const { start, end } = getWeekRange(selectedDate);
				return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
			})()}
		</h1>
	</div>

	{#if enableStudents}
		<div class="flex items-center gap-2">
			<div class="bg-gray-100 rounded-xl p-1 flex gap-1">
				<button
					onclick={() => (viewMode = 'day')}
					class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
				>Day</button>
				<button
					onclick={() => (viewMode = 'week')}
					class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
				>Week</button>
			</div>
		</div>
	{/if}
</div>

<!-- Appointments -->
{#if loading}
	<div class="text-center py-12 text-gray-400">Loading appointments…</div>
{:else if viewMode === 'day'}
	{#if appointments.length === 0}
		<div class="text-center py-12 text-gray-400">No red calendar events for this day.</div>
	{:else}
		<div class="space-y-3">
			{#each appointments as appt (appt.id)}
				<AppointmentCard
					appointment={appt}
					students={data.students}
					{enableStudents}
					onStatusChange={handleStatusChange}
					onPaidToggle={handlePaidToggle}
					onMatch={handleMatch}
					onNotesChange={handleNotesChange}
				/>
			{/each}
		</div>
	{/if}
{:else}
	<!-- Week view -->
	<div class="space-y-6">
		{#each weekDays() as day}
			<div>
				<h2 class="text-sm font-bold text-gray-700 mb-2 pb-1.5 border-b border-gray-200">{day.label}</h2>
				{#if day.appts.length === 0}
					<p class="text-xs text-gray-300 pl-2">No sessions</p>
				{:else}
					<div class="space-y-2">
						{#each day.appts as appt (appt.id)}
							<AppointmentCard
								appointment={appt}
								students={data.students}
								{enableStudents}
								onStatusChange={handleStatusChange}
								onPaidToggle={handlePaidToggle}
								onMatch={handleMatch}
								onNotesChange={handleNotesChange}
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- Confirm button -->
{#if appointments.some((a) => !a.locked)}
	<div class="mt-8 flex justify-end">
		<Button onclick={startConfirm} size="lg">Confirm &amp; Submit Period</Button>
	</div>
{/if}

<!-- Resolution dialog -->
<Dialog open={showResolution} title="Resolve Unmatched Appointments" onclose={() => (showResolution = false)}>
	<p class="text-sm text-gray-600 mb-4">Assign a student to each unmatched appointment before confirming.</p>
	<div class="space-y-4">
		{#each unresolvedUnmatched as appt}
			<div class="p-3 bg-purple-50 rounded-xl">
				<p class="text-sm font-medium text-purple-900">{appt.google_event_title}</p>
				<p class="text-xs text-purple-600 mb-2">{formatDate(appt.date)} · {new Date(appt.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
				<Select
					options={[
						{ value: '', label: 'Select student…' },
						...data.students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` })),
					]}
					value={resolutionMap[appt.id] ?? ''}
				/>
			</div>
		{/each}
	</div>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showResolution = false)}>Cancel</Button>
		<Button onclick={saveResolutions} disabled={unresolvedUnmatched.some((a) => !resolutionMap[a.id])}>
			Save &amp; Continue
		</Button>
	{/snippet}
</Dialog>

<!-- Confirm dialog -->
<Dialog open={showConfirm} title="Confirm Period" onclose={() => (showConfirm = false)}>
	<div class="space-y-3 text-sm text-gray-700">
		<p><span class="font-medium">Sessions:</span> {unlocked.length}</p>
		<p><span class="font-medium">Completed:</span> {unlocked.filter((a) => a.status === 'complete').length}</p>
		<p><span class="font-medium">Cancelled:</span> {unlocked.filter((a) => a.status === 'cancelled').length}</p>
		<p><span class="font-medium">No Show:</span> {unlocked.filter((a) => a.status === 'no_show').length}</p>
		<hr class="my-2" />
		<p><span class="font-medium">Total Hours:</span> {Math.round(totalHours * 100) / 100} hrs</p>
		<p><span class="font-medium">Est. Earnings:</span> ${Math.round(totalEarnings * 100) / 100}</p>
	</div>
	<p class="text-xs text-gray-400 mt-4">Confirming will lock these appointments and generate an Excel timesheet.</p>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showConfirm = false)}>Cancel</Button>
		<Button onclick={confirmPeriod} disabled={confirming}>
			{confirming ? 'Confirming…' : 'Confirm & Download'}
		</Button>
	{/snippet}
</Dialog>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
