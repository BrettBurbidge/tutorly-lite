<script lang="ts">
	import { page } from '$app/state';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';

	interface Props {
		displayName?: string;
		enableStudents?: boolean;
	}

	let { displayName = 'Tutor', enableStudents = false }: Props = $props();

	const supabase = createSupabaseBrowserClient();

	const navItems = $derived([
		{ href: '/portal', label: 'Portal', icon: '🗓' },
		...(enableStudents ? [
			{ href: '/portal/students', label: 'Students', icon: '👩‍🎓' },
			{ href: '/portal/parents', label: 'Parents', icon: '👪' },
		] : []),
		{ href: '/portal/timesheets', label: 'Timesheets', icon: '📋' },
		{ href: '/portal/settings', label: 'Settings', icon: '⚙️' },
	]);

	let mobileMenuOpen = $state(false);

	async function signOut() {
		await supabase.auth.signOut();
		goto('/');
	}

	function isActive(href: string) {
		if (href === '/portal') return page.url.pathname === '/portal';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
	<div class="max-w-5xl mx-auto px-4">
		<div class="flex items-center justify-between h-14">
			<!-- Logo + desktop nav -->
			<div class="flex items-center gap-6">
				<span class="font-bold text-gray-900 text-sm">TutorTimeCard</span>
				<div class="hidden sm:flex items-center gap-1">
					{#each navItems as item}
						<a
							href={item.href}
							class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
								isActive(item.href)
									? 'bg-blue-50 text-blue-700'
									: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
							}`}
						>
							{item.label}
						</a>
					{/each}
				</div>
			</div>

			<!-- Right side -->
			<div class="flex items-center gap-2">
				<span class="hidden sm:block text-xs text-gray-500 truncate max-w-32">{displayName}</span>
				<button
					onclick={signOut}
					class="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
				>
					Sign out
				</button>
				<!-- Mobile menu button -->
				<button
					class="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					aria-label="Toggle menu"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile menu -->
		{#if mobileMenuOpen}
			<div class="sm:hidden pb-3 border-t border-gray-100 pt-2 space-y-1">
				{#each navItems as item}
					<a
						href={item.href}
						onclick={() => (mobileMenuOpen = false)}
						class={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
							isActive(item.href)
								? 'bg-blue-50 text-blue-700'
								: 'text-gray-600 hover:bg-gray-100'
						}`}
					>
						<span>{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</nav>
