<script lang="ts">
	import { initials as toInitials } from '$lib/games';

	let {
		name,
		color = '#ff6a2b',
		size = 34
	}: { name: string; color?: string; size?: number } = $props();
</script>

<span
	class="avatar"
	style="--c: {color}; width: {size}px; height: {size}px; font-size: {size * 0.4}px"
	title={name}
>
	{toInitials(name) || '?'}
</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		border-radius: 50%;
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--c);
		background: color-mix(in srgb, var(--c) 16%, transparent);
		border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent);
		flex-shrink: 0;
		line-height: 1;
	}
</style>
