<script lang="ts">
	import CompetitionSetup from '$lib/components/CompetitionSetup.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>New competition — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow">Set up</span>
	<h1>New <span class="gradient-text">competition.</span></h1>
	<p class="muted">Add your crew and set how many games each plays — you'll pick weapons next.</p>
</div>

<CompetitionSetup
	suggestedName={data.suggestedName}
	initial={form?.values ?? {}}
	errors={form?.errors ?? {}}
/>

<style>
	.head {
		gap: 0.55rem;
		margin-bottom: 1.8rem;
	}
	h1 {
		font-size: clamp(2.2rem, 5vw, 3.2rem);
	}
</style>
