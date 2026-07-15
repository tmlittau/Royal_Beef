<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tone?: 'neutral' | 'accent' | 'cool';
		children: Snippet;
	};

	let { tone = 'neutral', children }: Props = $props();
</script>

<span class="badge {tone}">{@render children()}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.28em 0.7em;
		border-radius: var(--r-pill);
		border: 1px solid var(--border);
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--text-muted);
		background: var(--surface);
	}
	.accent {
		color: var(--amber);
		border-color: #ff6a2b3d;
		background: var(--accent-soft);
	}
	.cool {
		color: var(--cool);
		border-color: #35e0c14d;
		background: var(--cool-soft);
	}
</style>
