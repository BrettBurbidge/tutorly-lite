<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		variant?: 'default' | 'green' | 'orange' | 'red' | 'purple' | 'blue' | 'gray';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'default', class: className = '', children }: Props = $props();

	const variants = {
		default: 'bg-gray-100 text-gray-700',
		green: 'bg-green-100 text-green-700',
		orange: 'bg-orange-100 text-orange-700',
		red: 'bg-red-100 text-red-700',
		purple: 'bg-purple-100 text-purple-700',
		blue: 'bg-blue-100 text-blue-700',
		gray: 'bg-gray-100 text-gray-600',
	};
</script>

<span class={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
	{@render children?.()}
</span>
