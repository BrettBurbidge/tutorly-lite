<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		error?: string;
		value?: string | number;
	}

	let { label, error, class: className = '', id, value = $bindable(''), ...rest }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	{/if}
	<input
		{id}
		bind:value
		class={cn(
			'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full',
			error && 'border-red-400 focus:ring-red-500',
			className
		)}
		{...rest}
	/>
	{#if error}
		<p class="text-xs text-red-600">{error}</p>
	{/if}
</div>
