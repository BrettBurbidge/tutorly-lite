<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { data } = $props();

	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let acting = $state(false);

	async function toggleStatus(action: 'suspend' | 'reactivate') {
		acting = true;
		const res = await fetch(`/api/superadmin/tutors/${data.tutor.id}/suspend`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action }),
		});

		if (res.ok) {
			toast = {
				message: action === 'suspend' ? 'Tutor suspended.' : 'Tutor reactivated.',
				type: 'success',
			};
			await invalidateAll();
		} else {
			toast = { message: 'Action failed.', type: 'error' };
		}
		acting = false;
	}
</script>

<div class="mb-4">
	<a href="/superadmin/tutors" class="text-sm text-blue-600 hover:underline">← All Tutors</a>
</div>

<div class="flex items-start justify-between mb-6 gap-4 flex-wrap">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">{data.tutor.display_name}</h1>
		<p class="text-gray-500">{data.tutor.email}</p>
	</div>
	<div class="flex items-center gap-3">
		<Badge variant={data.tutor.status === 'active' ? 'green' : 'red'}>
			{data.tutor.status}
		</Badge>
		{#if data.tutor.status === 'active'}
			<Button variant="destructive" size="sm" disabled={acting} onclick={() => toggleStatus('suspend')}>
				Suspend
			</Button>
		{:else}
			<Button variant="secondary" size="sm" disabled={acting} onclick={() => toggleStatus('reactivate')}>
				Reactivate
			</Button>
		{/if}
	</div>
</div>

<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
	{#each [
		{ label: 'Signed Up', value: new Date(data.tutor.created_at).toLocaleDateString('en-US') },
		{ label: 'Students', value: String(data.tutor.student_count) },
		{ label: 'Timesheets', value: String(data.tutor.timesheet_count) },
	] as stat}
		<div class="bg-white rounded-xl border border-gray-200 p-4">
			<p class="text-2xl font-bold text-gray-900">{stat.value}</p>
			<p class="text-sm text-gray-500 mt-1">{stat.label}</p>
		</div>
	{/each}
</div>

<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
	<strong>Data access is restricted.</strong> Super-admin can only view aggregate statistics — no access to student names, appointment data, rates, or personal business data.
</div>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
