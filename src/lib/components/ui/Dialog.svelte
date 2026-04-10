<script lang="ts">
	interface Props {
		open?: boolean;
		title?: string;
		onclose?: () => void;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let { open = false, title, onclose, children, footer }: Props = $props();

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose?.();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
		onclick={handleBackdrop}
	>
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
			{#if title}
				<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
					<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
					<button
						onclick={onclose}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close dialog"
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="px-6 py-4 overflow-y-auto flex-1">
				{@render children?.()}
			</div>
			{#if footer}
				<div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
