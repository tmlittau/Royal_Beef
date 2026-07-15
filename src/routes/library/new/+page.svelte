<script lang="ts">
	import GameForm from '$lib/components/GameForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Add game — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow"><a href="/library" class="back">Library</a> · Add game</span>
	<h1>Add a <span class="gradient-text">game.</span></h1>
	<p class="muted">Search Steam to prefill the details, or enter them manually.</p>
</div>

<GameForm initial={form?.values ?? {}} errors={form?.errors ?? {}} submitLabel="Add game" />

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
</style>
