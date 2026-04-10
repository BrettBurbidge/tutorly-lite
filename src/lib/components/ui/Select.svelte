<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		options: { value: string; label: string }[];
		error?: string;
	}

	let { label, options, error, class: className = '', id, value = $bindable(), ...rest }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for={id} class="text-sm font-medium text-gray-700">{label}</label>
	{/if}
	<select
		{id}
		bind:value
		class={cn(
			'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full bg-white',
			error && 'border-red-400',
			className
		)}
		{...rest}
	>
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
	{#if error}
		<p class="text-xs text-red-600">{error}</p>
	{/if}
</div>
