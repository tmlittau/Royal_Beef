<script lang="ts">
	import Reveal from '$lib/components/Reveal.svelte';
	import { modeLabel, playerRange } from '$lib/games';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let revealed = $state(false);

	const pool = $derived(data.competitors.map((c) => ({ name: c.name, color: c.color })));
	const target = $derived({
		name: data.pick?.currentName ?? '?',
		color: data.pick?.currentColor ?? '#ff6a2b'
	});
</script>

<svelte:head>
	<title>Pick the next game — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow">
		🎲 {data.competitionName} · round {data.pick?.round}/{data.pick?.totalRounds} · pick
		{data.pick?.pickNumber}/{data.pick?.totalGames}
	</span>
</div>

<div class="reveal-wrap">
	<Reveal {target} {pool} label="— pick the next game" onrevealed={() => (revealed = true)} />
</div>

{#if revealed}
	<div class="grid">
		{#each data.games as g (g.id)}
			<form method="POST" action="?/pick" class="cell">
				<input type="hidden" name="gameId" value={g.id} />
				<button type="submit" class="pick">
					<span class="thumb">
						{#if g.coverUrl}
							<img src={g.coverUrl} alt="" loading="lazy" />
						{:else}
							<span class="ph">{g.name[0]}</span>
						{/if}
					</span>
					<span class="pname">{g.name}</span>
					<span class="pmeta">{playerRange(g.minPlayers, g.maxPlayers)}p · {modeLabel(g.defaultMode)}</span>
				</button>
			</form>
		{/each}
	</div>
{/if}

<style>
	.head {
		gap: 0.6rem;
		margin-bottom: 0.5rem;
		align-items: center;
		text-align: center;
	}
	.reveal-wrap {
		margin-bottom: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.7rem;
	}
	.cell {
		display: contents;
	}
	.pick {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.pick:hover {
		transform: translateY(-3px);
		border-color: #ff6a2b99;
		box-shadow: var(--shadow-glow);
	}
	.thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: var(--r-sm);
		overflow: hidden;
		background: var(--bg-2);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.ph {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		font-family: var(--font-display);
		font-size: 1.5rem;
		color: var(--text-faint);
	}
	.pname {
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pmeta {
		font-size: 0.74rem;
		color: var(--text-faint);
	}
</style>
