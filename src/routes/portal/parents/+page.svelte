<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';

	let { data } = $props();

	interface Parent {
		id: string;
		first_name: string;
		last_name: string;
		email: string | null;
		phone: string | null;
		students: { id: string; first_name: string; last_name: string }[];
	}

	let showDialog = $state(false);
	let editingParent = $state<Parent | null>(null);
	let saving = $state(false);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	let form = $state({ first_name: '', last_name: '', email: '', phone: '' });

	function openNew() {
		editingParent = null;
		form = { first_name: '', last_name: '', email: '', phone: '' };
		showDialog = true;
	}

	function openEdit(parent: Parent) {
		editingParent = parent;
		form = {
			first_name: parent.first_name,
			last_name: parent.last_name,
			email: parent.email ?? '',
			phone: parent.phone ?? '',
		};
		showDialog = true;
	}

	async function save() {
		saving = true;
		const url = editingParent ? `/api/portal/parents/${editingParent.id}` : '/api/portal/parents';
		const method = editingParent ? 'PATCH' : 'POST';

		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form),
		});

		if (res.ok) {
			showDialog = false;
			toast = { message: editingParent ? 'Parent updated.' : 'Parent added.', type: 'success' };
			await invalidateAll();
		} else {
			const err = await res.json() as { message?: string };
			toast = { message: err.message ?? 'Save failed', type: 'error' };
		}
		saving = false;
	}

	async function deleteParent(parent: Parent) {
		if (!confirm(`Delete ${parent.first_name} ${parent.last_name}? This cannot be undone.`)) return;

		const res = await fetch(`/api/portal/parents/${parent.id}`, { method: 'DELETE' });
		if (res.ok) {
			toast = { message: 'Parent deleted.', type: 'success' };
			await invalidateAll();
		} else {
			toast = { message: 'Delete failed.', type: 'error' };
		}
	}
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Parents</h1>
	<Button onclick={openNew}>+ Add Parent</Button>
</div>

{#if data.parents.length === 0}
	<div class="text-center py-16 text-gray-400">
		<p class="text-lg mb-2">No parents yet</p>
		<p class="text-sm">Add a parent to link them to students.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each data.parents as parent (parent.id)}
			<div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
				<div>
					<p class="font-semibold text-gray-900">{parent.first_name} {parent.last_name}</p>
					{#if parent.email}<p class="text-sm text-gray-500">{parent.email}</p>{/if}
					{#if parent.phone}<p class="text-sm text-gray-500">{parent.phone}</p>{/if}
					{#if parent.students.length > 0}
						<p class="text-xs text-gray-400 mt-1">
							Students: {(parent.students as {id:string;first_name:string;last_name:string}[]).map((s) => `${s.first_name} ${s.last_name}`).join(', ')}
						</p>
					{/if}
				</div>
				<div class="flex gap-2 shrink-0">
					<Button variant="outline" size="sm" onclick={() => openEdit(parent)}>Edit</Button>
					<Button variant="destructive" size="sm" onclick={() => deleteParent(parent)}>Delete</Button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<Dialog open={showDialog} title={editingParent ? 'Edit Parent' : 'Add Parent'} onclose={() => (showDialog = false)}>
	<div class="space-y-4">
		<Input label="First Name" bind:value={form.first_name} required />
		<Input label="Last Name" bind:value={form.last_name} required />
		<Input label="Email" type="email" bind:value={form.email} />
		<Input label="Phone" type="tel" bind:value={form.phone} />
	</div>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (showDialog = false)}>Cancel</Button>
		<Button onclick={save} disabled={saving || !form.first_name || !form.last_name}>
			{saving ? 'Saving…' : 'Save'}
		</Button>
	{/snippet}
</Dialog>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
