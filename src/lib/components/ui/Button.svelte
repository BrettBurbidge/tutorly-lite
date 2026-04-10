<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		variant = 'default',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variants = {
		default: 'bg-blue-600 text-white hover:bg-blue-700',
		outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
		ghost: 'text-gray-700 hover:bg-gray-100',
		destructive: 'bg-red-600 text-white hover:bg-red-700',
		secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs rounded-lg',
		md: 'px-4 py-2 text-sm rounded-xl',
		lg: 'px-6 py-3 text-base rounded-xl',
	};
</script>

<button
	class={cn(
		'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none',
		variants[variant],
		sizes[size],
		className
	)}
	{...rest}
>
	{@render children?.()}
</button>
