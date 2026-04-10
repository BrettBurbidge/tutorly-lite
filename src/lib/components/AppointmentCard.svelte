<script lang="ts">
	import Badge from './ui/Badge.svelte';
	import { formatTime, formatDuration } from '$lib/utils';

	interface Student {
		id: string;
		first_name: string;
		last_name: string;
		rate_type: string;
		rate_amount: string | number | null;
	}

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
		location?: string | null;
		matched_student_id: string | null;
		matched_student?: Student | null;
	}

	interface Props {
		appointment: Appointment;
		students?: Student[];
		enableStudents?: boolean;
		onStatusChange?: (id: string, status: Appointment['status']) => void;
		onPaidToggle?: (id: string, paid: boolean) => void;
		onMatch?: (id: string, studentId: string) => void;
		onNotesChange?: (id: string, notes: string | null) => void;
	}

	let { appointment, students = [], enableStudents = false, onStatusChange, onPaidToggle, onMatch, onNotesChange }: Props = $props();

	let showPicker = $state(false);
	let editingNotes = $state(false);
	let notesValue = $state('');

	function openNotes() {
		notesValue = appointment.notes ?? '';
		editingNotes = true;
	}

	function saveNotes() {
		editingNotes = false;
		const trimmed = notesValue.trim() || null;
		if (trimmed !== (appointment.notes ?? null)) {
			onNotesChange?.(appointment.id, trimmed);
		}
	}

	const isUnmatched = $derived(!appointment.matched_student_id);

	const cardColors: Record<string, string> = {
		default: 'bg-gray-50 border-gray-200',
		complete: 'bg-green-50 border-green-200',
		cancelled: 'bg-orange-50 border-orange-200',
		no_show: 'bg-red-50 border-red-200',
	};

	const cardColor = $derived(
		isUnmatched
			? 'bg-purple-50 border-purple-200'
			: cardColors[appointment.status] ?? cardColors.default
	);

	const studentName = $derived(
		appointment.matched_student
			? `${appointment.matched_student.first_name} ${appointment.matched_student.last_name}`
			: appointment.google_event_title
	);

	const rateLabel = $derived(() => {
		if (!appointment.matched_student) return '—';
		const r = Number(appointment.matched_student.rate_amount);
		const type = appointment.matched_student.rate_type;
		return type === 'hourly' ? `$${r}/hr` : `$${r} flat`;
	});

	const statusButtons: { label: string; value: Appointment['status']; color: string }[] = [
		{ label: 'Complete', value: 'complete', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
		{ label: 'Cancelled', value: 'cancelled', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
		{ label: 'No Show', value: 'no_show', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
	];
</script>

<div class={`rounded-xl border-2 p-4 transition-colors ${cardColor}`}>
	<div class="flex items-start justify-between gap-2">
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 flex-wrap">
				<p class="font-semibold text-gray-900 truncate">{studentName}</p>
				{#if enableStudents && isUnmatched}
					{#if !appointment.locked && students.length > 0}
						<button
							onclick={() => (showPicker = !showPicker)}
							class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
							title="Click to assign a student"
						>
							Unmatched ▾
						</button>
					{:else}
						<Badge variant="purple">Unmatched</Badge>
					{/if}
				{/if}
				{#if enableStudents && showPicker}
					<select
						class="text-xs rounded-lg border border-purple-300 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
						onchange={(e) => {
							const val = (e.currentTarget as HTMLSelectElement).value;
							if (val) { onMatch?.(appointment.id, val); showPicker = false; }
						}}
					>
						<option value="">Select student…</option>
						{#each students as s}
							<option value={s.id}>{s.first_name} {s.last_name}</option>
						{/each}
					</select>
				{/if}
				{#if appointment.status !== 'default'}
					<Badge variant={
						appointment.status === 'complete' ? 'green' :
						appointment.status === 'cancelled' ? 'orange' : 'red'
					}>
						{appointment.status === 'no_show' ? 'No Show' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
					</Badge>
				{/if}
			</div>
			<p class="text-sm text-gray-500 mt-0.5">
				{formatTime(appointment.start_time)} · {formatDuration(appointment.start_time, appointment.end_time)}
				{#if appointment.location}<span class="text-gray-400">· {appointment.location}</span>{/if}
			</p>
			{#if enableStudents}<p class="text-xs text-gray-400 mt-0.5">{rateLabel()}</p>{/if}

			<!-- Notes (editable even when locked) -->
			{#if editingNotes}
				<div class="mt-2 flex gap-2 items-start">
					<textarea
						class="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
						rows="2"
						placeholder="Add a note…"
						bind:value={notesValue}
						onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(); } if (e.key === 'Escape') { editingNotes = false; notesValue = appointment.notes ?? ''; } }}
					></textarea>
					<button onclick={saveNotes} class="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium shrink-0">Save</button>
				</div>
			{:else if appointment.notes}
				<button onclick={openNotes} class="text-left mt-1.5 text-xs text-gray-500 italic hover:text-gray-700 transition-colors">
					"{appointment.notes}"
				</button>
			{:else}
				<button onclick={openNotes} class="mt-1.5 text-xs text-gray-300 hover:text-gray-400 transition-colors">
					+ Add note
				</button>
			{/if}
		</div>

		<!-- Paid toggle (students mode only; read-only when locked) -->
		{#if enableStudents || appointment.locked}
			{#if !appointment.locked}
				<button
					onclick={() => onPaidToggle?.(appointment.id, !appointment.paid)}
					class={`text-xs px-2 py-1 rounded-lg font-medium transition-colors shrink-0 ${
						appointment.paid
							? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
							: 'bg-gray-100 text-gray-500 hover:bg-gray-200'
					}`}
				>
					{appointment.paid ? 'Paid' : 'Unpaid'}
				</button>
			{:else}
				<Badge variant={appointment.paid ? 'blue' : 'gray'}>{appointment.paid ? 'Paid' : 'Unpaid'}</Badge>
			{/if}
		{/if}
	</div>

	<!-- Status buttons -->
	{#if !appointment.locked}
		<div class="flex gap-2 mt-3 flex-wrap">
			{#each statusButtons as btn}
				<button
					onclick={() => {
						const newStatus = appointment.status === btn.value ? 'default' : btn.value;
						onStatusChange?.(appointment.id, newStatus);
					}}
					class={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
						appointment.status === btn.value
							? btn.color + ' ring-2 ring-offset-1 ring-current'
							: 'bg-white/70 text-gray-600 hover:bg-white border border-gray-200'
					}`}
				>
					{btn.label}
				</button>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-gray-400 mt-2 italic">Locked — timesheet submitted</p>
	{/if}
</div>
