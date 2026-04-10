<script lang="ts">
	import PortalNav from '$lib/components/PortalNav.svelte';

	let { children, data } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<PortalNav displayName={data.displayName} enableStudents={data.enableStudents} />
	<main class="max-w-5xl mx-auto px-4 py-6">
		{@render children()}
	</main>
</div>
