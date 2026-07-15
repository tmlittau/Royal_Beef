<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Library — Royal Beef</title>
</svelte:head>

<div class="head">
	<div class="stack heading">
		<span class="eyebrow">Game library</span>
		<h1>The <span class="gradient-text">library.</span></h1>
		<p class="muted">
			{data.games.length} game{data.games.length === 1 ? '' : 's'} ready. Click one to edit, or add another.
		</p>
	</div>
	<Button href="/library/new" size="lg">+ Add game</Button>
</div>

{#if data.games.length === 0}
	<Card padding="2.5rem">
		<div class="empty stack">
			<h3>No games yet</h3>
			<p class="muted">Add your first local multiplayer game to get started.</p>
			<Button href="/library/new">+ Add game</Button>
		</div>
	</Card>
{:else}
	<div class="grid">
		{#each data.games as game (game.id)}
			<GameCard {game} />
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}
	.heading {
		gap: 0.55rem;
	}
	h1 {
		font-size: clamp(2.2rem, 5vw, 3.2rem);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
		gap: 1.1rem;
	}
	.empty {
		align-items: flex-start;
		gap: 0.8rem;
	}
</style>
