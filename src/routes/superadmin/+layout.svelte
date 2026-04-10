<script lang="ts">
	import { page } from '$app/state';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let { children } = $props();

	const supabase = createSupabaseBrowserClient();

	const navItems = [
		{ href: '/superadmin/dashboard', label: 'Dashboard' },
		{ href: '/superadmin/tutors', label: 'Tutors' },
	];

	function isActive(href: string) {
		return page.url.pathname.startsWith(href);
	}

	async function signOut() {
		await supabase.auth.signOut();
		goto('/login');
	}
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-gray-900 text-white sticky top-0 z-40">
		<div class="max-w-6xl mx-auto px-4">
			<div class="flex items-center justify-between h-14">
				<div class="flex items-center gap-6">
					<span class="font-bold text-sm text-gray-300">Tutorly · Super Admin</span>
					<div class="flex gap-1">
						{#each navItems as item}
							<a
								href={item.href}
								class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									isActive(item.href)
										? 'bg-gray-700 text-white'
										: 'text-gray-400 hover:bg-gray-800 hover:text-white'
								}`}
							>
								{item.label}
							</a>
						{/each}
					</div>
				</div>
				<button onclick={signOut} class="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
					Sign out
				</button>
			</div>
		</div>
	</nav>
	<main class="max-w-6xl mx-auto px-4 py-6">
		{@render children()}
	</main>
</div>
