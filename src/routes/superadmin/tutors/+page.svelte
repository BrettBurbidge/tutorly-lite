<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { data } = $props();

	let search = $state(untrack(() => data.search));
	let statusFilter = $state(untrack(() => data.status));
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (statusFilter) params.set('status', statusFilter);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	async function suspend(id: string, action: 'suspend' | 'reactivate') {
		const res = await fetch(`/api/superadmin/tutors/${id}/suspend`, {
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
	}
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Tutors</h1>
	<span class="text-sm text-gray-500">{data.rows.length} result{data.rows.length !== 1 ? 's' : ''}</span>
</div>

<!-- Filters -->
<div class="flex gap-3 mb-6 flex-wrap">
	<input
		type="text"
		bind:value={search}
		onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		placeholder="Search by name or email…"
		class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-48"
	/>
	<select
		bind:value={statusFilter}
		class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
	>
		<option value="">All statuses</option>
		<option value="active">Active</option>
		<option value="suspended">Suspended</option>
	</select>
	<Button variant="secondary" size="sm" onclick={applyFilters}>Filter</Button>
</div>

<!-- Table -->
<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-gray-100 bg-gray-50">
					<th class="text-left px-4 py-3 font-medium text-gray-600">Name</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Email</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
					<th class="text-left px-4 py-3 font-medium text-gray-600">Signed up</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Students</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Timesheets</th>
					<th class="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each data.rows as row (row.id)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3">
							<a href={`/superadmin/tutors/${row.id}`} class="font-medium text-gray-900 hover:text-blue-600">{row.display_name}</a>
						</td>
						<td class="px-4 py-3 text-gray-500">{row.email}</td>
						<td class="px-4 py-3">
							<Badge variant={row.status === 'active' ? 'green' : 'red'}>{row.status}</Badge>
						</td>
						<td class="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString('en-US')}</td>
						<td class="px-4 py-3 text-right text-gray-700">{row.student_count}</td>
						<td class="px-4 py-3 text-right text-gray-700">{row.timesheet_count}</td>
						<td class="px-4 py-3 text-right">
							<div class="flex gap-2 justify-end">
								<a href={`/superadmin/tutors/${row.id}`}>
									<Button variant="ghost" size="sm">View</Button>
								</a>
								{#if row.status === 'active'}
									<Button variant="destructive" size="sm" onclick={() => suspend(row.id, 'suspend')}>Suspend</Button>
								{:else}
									<Button variant="secondary" size="sm" onclick={() => suspend(row.id, 'reactivate')}>Reactivate</Button>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="px-4 py-12 text-center text-gray-400">No tutors found.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
