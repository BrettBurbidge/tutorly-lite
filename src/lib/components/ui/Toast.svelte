<script lang="ts">
	interface Props {
		message: string;
		type?: 'success' | 'error' | 'info';
		onclose?: () => void;
	}

	let { message, type = 'info', onclose }: Props = $props();

	const styles = {
		success: 'bg-green-600',
		error: 'bg-red-600',
		info: 'bg-gray-800',
	};
</script>

<div class={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-lg ${styles[type]}`}>
	<span>{message}</span>
	<button onclick={onclose} class="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">✕</button>
</div>
