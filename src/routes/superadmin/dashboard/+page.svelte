<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	let { data } = $props();
</script>

<h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

<!-- Summary cards -->
<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
	{#each [
		{ label: 'Total Tutors', value: data.stats.total, color: 'bg-blue-50 text-blue-700' },
		{ label: 'Active', value: data.stats.active, color: 'bg-green-50 text-green-700' },
		{ label: 'Suspended', value: data.stats.suspended, color: 'bg-red-50 text-red-700' },
		{ label: 'Signups This Month', value: data.stats.thisMonth, color: 'bg-purple-50 text-purple-700' },
	] as card}
		<div class={`rounded-xl p-5 ${card.color}`}>
			<p class="text-3xl font-bold">{card.value}</p>
			<p class="text-sm mt-1 opacity-80">{card.label}</p>
		</div>
	{/each}
</div>

<!-- Recent signups -->
<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
	<div class="px-5 py-4 border-b border-gray-100">
		<h2 class="font-semibold text-gray-900">Recent Signups</h2>
	</div>
	<div class="divide-y divide-gray-100">
		{#each data.recentSignups as tutor (tutor.id)}
			<div class="px-5 py-3 flex items-center justify-between gap-4">
				<div>
					<p class="font-medium text-gray-900 text-sm">{tutor.display_name}</p>
					<p class="text-xs text-gray-500">{tutor.email}</p>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<span class="text-xs text-gray-400">{new Date(tutor.created_at).toLocaleDateString('en-US')}</span>
					<Badge variant={tutor.status === 'active' ? 'green' : 'red'}>
						{tutor.status}
					</Badge>
					<a href={`/superadmin/tutors/${tutor.id}`} class="text-xs text-blue-600 hover:underline">View</a>
				</div>
			</div>
		{:else}
			<div class="px-5 py-8 text-center text-gray-400 text-sm">No signups yet.</div>
		{/each}
	</div>
</div>
