<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/space-grotesk';
	import '../app.css';
	import type { Snippet } from 'svelte';
	import Nav from '$lib/components/Nav.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Nav />
<main class="container page">
	{@render children()}
</main>

<style>
	.page {
		padding-block: clamp(2.5rem, 6vw, 5rem);
	}
</style>
