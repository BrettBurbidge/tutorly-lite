<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let { data } = $props();

	interface Student {
		id: string;
		first_name: string;
		last_name: string;
		grade_level: string | null;
		notes: string | null;
		rate_type: string;
		rate_amount: { toString(): string } | string | number;
		parent: { id: string; first_name: string; last_name: string };
	}

	let showDialog = $state(false);
	let editingStudent = $state<Student | null>(null);
	let saving = $state(false);
	let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	// Wizard state (add flow only)
	let step = $state<1 | 2>(1);
	let parentMode = $state<'existing' | 'new'>('existing');
	let newParentForm = $state({ first_name: '', last_name: '', email: '', phone: '' });

	let form = $state({
		first_name: '',
		last_name: '',
		parent_id: '',
		grade_level: '',
		notes: '',
		rate_type: 'hourly',
		rate_amount: '',
	});

	const parentOptions = $derived([
		{ value: '', label: 'Select parent…' },
		...(data.parents as {id:string;first_name:string;last_name:string}[]).map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
	]);

	function openNew() {
		editingStudent = null;
		step = 1;
		parentMode = 'existing';
		newParentForm = { first_name: '', last_name: '', email: '', phone: '' };
		form = { first_name: '', last_name: '', parent_id: '', grade_level: '', notes: '', rate_type: 'hourly', rate_amount: '' };
		showDialog = true;
	}

	function openEdit(s: Student) {
		editingStudent = s;
		form = {
			first_name: s.first_name,
			last_name: s.last_name,
			parent_id: s.parent.id,
			grade_level: s.grade_level ?? '',
			notes: s.notes ?? '',
			rate_type: s.rate_type,
			rate_amount: String(s.rate_amount),
		};
		showDialog = true;
	}

	function closeDialog() {
		showDialog = false;
		step = 1;
	}

	const step1Valid = $derived(!!form.first_name && !!form.last_name);
	const step2Valid = $derived(
		parentMode === 'existing'
			? !!form.parent_id
			: !!newParentForm.first_name && !!newParentForm.last_name
	);

	async function save() {
		if (editingStudent) {
			// Edit flow — single step, direct save
			saving = true;
			const res = await fetch(`/api/portal/students/${editingStudent.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...form, rate_amount: parseFloat(form.rate_amount) || 0 }),
			});
			if (res.ok) {
				showDialog = false;
				toast = { message: 'Student updated.', type: 'success' };
				await invalidateAll();
			} else {
				const err = await res.json() as { message?: string };
				toast = { message: err.message ?? 'Save failed', type: 'error' };
			}
			saving = false;
			return;
		}

		// Add flow — wizard step 2 submit
		saving = true;

		let parentId = form.parent_id;

		if (parentMode === 'new') {
			const parentRes = await fetch('/api/portal/parents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newParentForm),
			});
			if (!parentRes.ok) {
				const err = await parentRes.json() as { message?: string };
				toast = { message: err.message ?? 'Failed to create parent', type: 'error' };
				saving = false;
				return;
			}
			const parent = await parentRes.json() as { id: string };
			parentId = parent.id;
		}

		const res = await fetch('/api/portal/students', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...form, parent_id: parentId, rate_amount: parseFloat(form.rate_amount) || 0 }),
		});

		if (res.ok) {
			showDialog = false;
			step = 1;
			toast = { message: 'Student added.', type: 'success' };
			await invalidateAll();
		} else {
			const err = await res.json() as { message?: string };
			toast = { message: err.message ?? 'Save failed', type: 'error' };
		}
		saving = false;
	}

	async function deleteStudent(s: Student) {
		if (!confirm(`Delete ${s.first_name} ${s.last_name}? This cannot be undone.`)) return;

		const res = await fetch(`/api/portal/students/${s.id}`, { method: 'DELETE' });
		if (res.ok) {
			toast = { message: 'Student deleted.', type: 'success' };
			await invalidateAll();
		} else {
			toast = { message: 'Delete failed.', type: 'error' };
		}
	}
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Students</h1>
	<Button onclick={openNew}>+ Add Student</Button>
</div>

{#if data.students.length === 0}
	<div class="text-center py-16 text-gray-400">
		<p class="text-lg mb-2">No students yet</p>
		<p class="text-sm">Add students to start matching calendar appointments.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each data.students as student (student.id)}
			<div class="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
				<div>
					<div class="flex items-center gap-2">
						<p class="font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
						{#if student.grade_level}
							<Badge variant="blue">{student.grade_level}</Badge>
						{/if}
					</div>
					<p class="text-sm text-gray-500">
						Parent: {student.parent.first_name} {student.parent.last_name}
					</p>
					<p class="text-sm text-gray-500">
						Rate: ${Number(student.rate_amount).toFixed(2)}/{student.rate_type === 'hourly' ? 'hr' : 'session'}
					</p>
					{#if student.notes}
						<p class="text-xs text-gray-400 mt-1">{student.notes}</p>
					{/if}
				</div>
				<div class="flex gap-2 shrink-0">
					<Button variant="outline" size="sm" onclick={() => openEdit(student)}>Edit</Button>
					<Button variant="destructive" size="sm" onclick={() => deleteStudent(student)}>Delete</Button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<Dialog open={showDialog} title={editingStudent ? 'Edit Student' : 'Add Student'} onclose={closeDialog}>
	{#if !editingStudent}
		<!-- Step indicator -->
		<div class="flex items-center gap-2 mb-5">
			<span class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
			<div class="flex-1 h-0.5 bg-gray-200">
				<div class={`h-full bg-blue-600 transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`}></div>
			</div>
			<span class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
			<span class="text-xs text-gray-400 ml-1">{step === 1 ? 'Student details' : 'Assign parent'}</span>
		</div>
	{/if}

	{#if editingStudent || step === 1}
		<!-- Step 1: Student details (or edit form) -->
		<div class="space-y-4">
			<Input label="First Name" bind:value={form.first_name} required />
			<Input label="Last Name" bind:value={form.last_name} required />
			{#if editingStudent}
				<Select label="Parent" options={parentOptions} bind:value={form.parent_id} />
			{/if}
			<Input label="Grade Level" bind:value={form.grade_level} placeholder="e.g. Grade 10" />
			<Select
				label="Rate Type"
				options={[{ value: 'hourly', label: 'Hourly' }, { value: 'flat', label: 'Flat per session' }]}
				bind:value={form.rate_type}
			/>
			<Input label="Rate Amount ($)" type="number" min="0" step="0.01" bind:value={form.rate_amount} />
			<div class="flex flex-col gap-1">
				<label for="notes" class="text-sm font-medium text-gray-700">Notes</label>
				<textarea
					id="notes"
					bind:value={form.notes}
					class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full resize-none"
					rows="3"
					placeholder="Optional notes…"
				></textarea>
			</div>
		</div>
	{:else}
		<!-- Step 2: Parent assignment -->
		<div class="space-y-4">
			<div class="flex gap-3">
				<button
					onclick={() => (parentMode = 'existing')}
					class={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${parentMode === 'existing' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
				>
					Existing parent
				</button>
				<button
					onclick={() => (parentMode = 'new')}
					class={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${parentMode === 'new' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
				>
					New parent
				</button>
			</div>

			{#if parentMode === 'existing'}
				{#if parentOptions.length <= 1}
					<p class="text-sm text-gray-400 text-center py-2">No parents yet — switch to "New parent" above.</p>
				{:else}
					<Select label="Select parent" options={parentOptions} bind:value={form.parent_id} />
				{/if}
			{:else}
				<div class="space-y-3 p-3 bg-gray-50 rounded-xl">
					<div class="grid grid-cols-2 gap-3">
						<Input label="First Name" bind:value={newParentForm.first_name} required />
						<Input label="Last Name" bind:value={newParentForm.last_name} required />
					</div>
					<Input label="Email" type="email" bind:value={newParentForm.email} placeholder="Optional" />
					<Input label="Phone" type="tel" bind:value={newParentForm.phone} placeholder="Optional" />
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if editingStudent}
			<Button variant="outline" onclick={closeDialog}>Cancel</Button>
			<Button onclick={save} disabled={saving || !form.first_name || !form.last_name || !form.parent_id}>
				{saving ? 'Saving…' : 'Save'}
			</Button>
		{:else if step === 1}
			<Button variant="outline" onclick={closeDialog}>Cancel</Button>
			<Button onclick={() => (step = 2)} disabled={!step1Valid}>Next →</Button>
		{:else}
			<Button variant="outline" onclick={() => (step = 1)}>← Back</Button>
			<Button onclick={save} disabled={saving || !step2Valid}>
				{saving ? 'Saving…' : 'Add Student'}
			</Button>
		{/if}
	{/snippet}
</Dialog>

{#if toast}
	<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />
{/if}
