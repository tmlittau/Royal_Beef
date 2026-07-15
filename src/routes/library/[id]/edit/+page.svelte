<script lang="ts">
	import GameForm from '$lib/components/GameForm.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Edit {data.game.name} — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow"><a href="/library" class="back">Library</a> · Edit</span>
	<h1>Edit <span class="gradient-text">{data.game.name}.</span></h1>
</div>

<GameForm
	action="?/update"
	initial={form?.values ?? data.game}
	errors={form?.errors ?? {}}
	submitLabel="Save changes"
/>

<div class="danger-zone">
	<div class="stack">
		<strong>Delete this game</strong>
		<span class="faint">Removes it from the library. Past competition results are unaffected.</span>
	</div>
	<form
		method="POST"
		action="?/delete"
		onsubmit={(e) => {
			if (!confirm(`Delete “${data.game.name}” from the library?`)) e.preventDefault();
		}}
	>
		<Button type="submit" variant="danger">Delete game</Button>
	</form>
</div>

<style>
	.head {
		gap: 0.55rem;
		margin-bottom: 1.8rem;
	}
	h1 {
		font-size: clamp(2.2rem, 5vw, 3.2rem);
	}
	.back {
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.back:hover {
		color: var(--text);
	}
	.danger-zone {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		max-width: 760px;
		margin-top: 2.5rem;
		padding: 1.2rem 1.4rem;
		border: 1px solid #ff2d5533;
		border-radius: var(--r-md);
		background: #ff2d550a;
	}
</style>
