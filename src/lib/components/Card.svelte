<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		padding?: string;
		glow?: boolean;
		children: Snippet;
	};

	let { padding = '1.4rem', glow = false, children }: Props = $props();
</script>

<div class="card" class:glow style="--card-padding: {padding}">
	{@render children()}
</div>

<style>
	.card {
		padding: var(--card-padding);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-md);
		background-image: linear-gradient(180deg, #ffffff0d, #ffffff03);
	}
	.card.glow {
		box-shadow: var(--shadow-md), var(--shadow-glow);
		border-color: var(--border-strong);
	}
</style>
