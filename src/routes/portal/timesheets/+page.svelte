<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let emailingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let drivingId = $state<string | null>(null);

	async function emailTimesheet(id: string) {
		emailingId = id;
		const res = await fetch(`/api/timesheets/${id}/email`, { method: 'POST' });
		if (res.ok) {
			toast = { message: 'Timesheet emailed to you!', type: 'success' };
		} else {
			toast = { message: 'Failed to send email.', type: 'error' };
		}
		emailingId = null;
	}

	async function exportToDrive(id: string) {
		drivingId = id;
		const res = await fetch(`/api/timesheets/${id}/export-to-drive`, { method: 'POST' });
		if (res.ok) {
			const body = await res.json();
			toast = { message: `Saved to Google Sheets as tab "${body.tabName}"!`, type: 'success' };
		} else {
			const text = await res.text();
			const msg = text.includes('NO_SHEETS_FILE')
				? 'No Sheets file configured. Set one in Settings first.'
				: text.includes('MISSING_TOKENS') || text.includes('SHEETS_NO_PERMISSION')
					? 'Google Sheets access not granted. Go to Settings and click "Reconnect Google (Calendar + Sheets)".'
					: text.includes('SHEETS_FILE_NOT_FOUND')
						? 'Google Sheets file not found. Check your target file in Settings.'
						: text.includes('TAB_EXISTS')
							? 'A tab for this period already exists in your Sheets file.'
							: 'Failed to export to Google Drive.';
			toast = { message: msg, type: 'error' };
		}
		drivingId = null;
	}

	async function deleteTimesheet(id: string) {
		if (!confirm('Delete this timesheet? All appointments will be unlocked and returned to the portal.')) return;
		deletingId = id;
		const res = await fetch(`/api/timesheets/${id}`, { method: 'DELETE' });
		if (res.ok) {
			toast = { message: 'Timesheet deleted. Appointments are unlocked.', type: 'success' };
			await invalidateAll();
		} else {
			toast = { message: 'Failed to delete timesheet.', type: 'error' };
		}
		deletingId = null;
	}
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Timesheets</h1>
</div>

{#if data.timesheets.length === 0}
	<div class="text-center py-16 text-gray-400">
		<p class="text-lg mb-2">No timesheets yet</p>
		<p class="text-sm">Confirmed periods will appear here.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each data.timesheets as ts (ts.id)}
			<div class="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
				<div>
					<p class="font-semibold text-gray-900">
						{new Date(ts.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
						{#if ts.period_type === 'week'}
							– {new Date(ts.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
						{/if}
						<span class="text-xs font-normal text-gray-400 ml-1">({ts.period_type})</span>
					</p>
					<p class="text-sm text-gray-500">
						{ts._count.appointments} appointments · Submitted {new Date(ts.submitted_at).toLocaleDateString('en-US')}
					</p>
				</div>
				<div class="flex gap-2 shrink-0">
					<a href={`/api/timesheets/${ts.id}/export`} download>
						<Button variant="outline" size="sm">Download</Button>
					</a>
					<Button
						variant="outline"
						size="sm"
						onclick={() => exportToDrive(ts.id)}
						disabled={drivingId === ts.id}
					>
						{drivingId === ts.id ? 'Saving…' : 'Save to Sheets'}
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onclick={() => emailTimesheet(ts.id)}
						disabled={emailingId === ts.id}
					>
						{emailingId === ts.id ? 'Sending…' : 'Email to Me'}
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onclick={() => deleteTimesheet(ts.id)}
						disabled={deletingId === ts.id}
					>
						{deletingId === ts.id ? 'Deleting…' : 'Delete'}
					</Button>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
