<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { modeLabel } from '$lib/games';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let nextIndex = $derived(data.games.findIndex((g) => g.status !== 'finished'));
	let playedCount = $derived(data.games.filter((g) => g.status === 'finished').length);
	let allZero = $derived(data.standings.every((s) => s.points === 0));
</script>

<svelte:head>
	<title>{data.competition.name} — Royal Beef</title>
</svelte:head>

<div class="head">
	<div class="stack heading">
		<span class="eyebrow">
			{#if data.competition.status === 'finished'}Finished{:else}In progress{/if} ·
			{playedCount}/{data.games.length} games
		</span>
		<h1>{data.competition.name}</h1>
		<p class="muted">
			{data.standings.length} players · {data.games.length} games · target {data.competition
				.timeBudgetMinutes}m each
		</p>
	</div>
</div>

<div class="layout">
	<!-- Rounds -->
	<section class="rounds">
		<h2 class="section-title">Rounds</h2>
		<div class="stack list">
			{#each data.games as g, i (g.cgId)}
				<div class="round" class:next={i === nextIndex} class:done={g.status === 'finished'}>
					<span class="idx">{i + 1}</span>
					<span class="cover">
						{#if g.coverUrl}
							<img src={g.coverUrl} alt="" loading="lazy" />
						{:else}
							<span class="ph">{g.name[0]}</span>
						{/if}
					</span>
					<div class="info">
						<strong>{g.name}</strong>
						<span class="meta">{modeLabel(g.mode)} · ~{g.roundMinutes}m</span>
					</div>
					<div class="state">
						{#if g.status === 'finished'}
							<Badge tone="cool">✓ Done</Badge>
						{:else if i === nextIndex}
							<Button href="/competition/{data.competition.id}/game/{g.cgId}">Set up &amp; play →</Button>
						{:else}
							<Badge>Up next</Badge>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Standings -->
	<aside class="standings">
		<h2 class="section-title">Standings</h2>
		<div class="board">
			{#each data.standings as s, i (s.id)}
				<div class="srow" class:lead={i === 0 && !allZero}>
					<span class="rank">{i + 1}</span>
					<Avatar name={s.name} color={s.color} size={30} />
					<span class="sname">{s.name}</span>
					<span class="pts">{s.points}</span>
				</div>
			{/each}
		</div>
		{#if allZero}
			<p class="faint note">Points appear here as games finish (3 · 2 · 1 to the top three).</p>
		{/if}
	</aside>
</div>

<div class="foot">
	<Button href="/" variant="ghost">← Dashboard</Button>
</div>

<style>
	.head {
		margin-bottom: 1.8rem;
	}
	.heading {
		gap: 0.5rem;
	}
	h1 {
		font-size: clamp(2rem, 4.5vw, 3rem);
	}

	.layout {
		display: grid;
		grid-template-columns: 1.6fr 1fr;
		gap: 1.6rem;
		align-items: start;
	}
	.section-title {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted);
		margin-bottom: 0.9rem;
	}

	.list {
		gap: 0.65rem;
	}
	.round {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
		transition: border-color 0.2s var(--ease);
	}
	.round.next {
		border-color: #ff6a2b80;
		box-shadow: var(--shadow-glow);
		background: var(--accent-soft);
	}
	.round.done {
		opacity: 0.72;
	}
	.idx {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		flex-shrink: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-muted);
		background: var(--bg-2);
		border-radius: var(--r-pill);
	}
	.cover {
		width: 66px;
		height: 37px;
		flex-shrink: 0;
		border-radius: var(--r-xs);
		overflow: hidden;
		background: var(--bg-2);
	}
	.cover img {
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
		color: var(--text-faint);
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1;
		min-width: 0;
	}
	.info strong {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 0.78rem;
		color: var(--text-faint);
	}
	.state {
		flex-shrink: 0;
	}

	.standings {
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		position: sticky;
		top: calc(var(--nav-h) + 1rem);
	}
	.board {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.srow {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.5rem 0.5rem;
		border-radius: var(--r-sm);
	}
	.srow.lead {
		background: var(--accent-soft);
	}
	.rank {
		width: 1.3rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-faint);
		text-align: center;
	}
	.sname {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pts {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.05rem;
	}
	.note {
		margin-top: 0.8rem;
		font-size: 0.78rem;
		line-height: 1.5;
	}

	.foot {
		margin-top: 2rem;
	}

	@media (max-width: 800px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.standings {
			position: static;
		}
	}
</style>
