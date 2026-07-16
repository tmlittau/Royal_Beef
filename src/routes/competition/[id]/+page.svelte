<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import { modeLabel } from '$lib/games';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const id = $derived(data.competition.id);
	const status = $derived(data.competition.status);
	const totalGames = $derived(data.pick?.totalGames ?? 0);
	const playedCount = $derived(data.games.filter((g) => g.status === 'finished').length);
	const activeGame = $derived(data.games.find((g) => g.cgId === data.activeGameId) ?? null);
	const allZero = $derived(data.standings.every((s) => s.points === 0));
	const hasFinishedGame = $derived(data.games.some((g) => g.status === 'finished'));

	let confirmEnd = $state(false);
</script>

<svelte:head>
	<title>{data.competition.name} — Royal Beef</title>
</svelte:head>

<div class="head">
	<div class="stack heading">
		<span class="eyebrow">
			{#if status === 'controllers'}Picking weapons
			{:else if status === 'finished'}Finished · {totalGames} games
			{:else}In progress · {playedCount}/{totalGames} games · round {data.pick?.round}/{data.pick
					?.totalRounds}{/if}
		</span>
		<h1>{data.competition.name}</h1>
		<p class="muted">
			{data.standings.length} players · {data.competition.gamesPerPlayer} games each · target {data
				.competition.timeBudgetMinutes}m
		</p>
	</div>
</div>

<!-- Primary action -->
{#if status === 'controllers'}
	<a class="banner weapons" href="/competition/{id}/controllers">
		<span>⚔️ <strong>Pick your weapons</strong> — choose controllers to begin</span>
		<span class="arrow">→</span>
	</a>
{:else if status === 'finished'}
	<a class="banner" href="/competition/{id}/results">
		<span>🏆 <strong>Competition complete</strong> — see the champion &amp; highlights</span>
		<span class="arrow">→</span>
	</a>
{:else if activeGame}
	<a class="banner" href="/competition/{id}/game/{activeGame.cgId}">
		<span>▶ <strong>Continue</strong> — {activeGame.name}</span>
		<span class="arrow">→</span>
	</a>
{:else if data.pick?.currentPickerId != null}
	<a class="banner pick" href="/competition/{id}/pick">
		<span>🎲 <strong>Next game</strong> — pick {data.pick.pickNumber} of {totalGames} (who's next?)</span>
		<span class="arrow">→</span>
	</a>
{/if}

<div class="layout">
	<!-- Games so far -->
	<section class="rounds">
		<h2 class="section-title">Games</h2>
		<div class="stack list">
			{#each data.games as g (g.cgId)}
				<div class="round" class:done={g.status === 'finished'}>
					<span class="idx">{g.orderIndex + 1}</span>
					<span class="cover">
						{#if g.coverUrl}
							<img src={g.coverUrl} alt="" loading="lazy" />
						{:else}
							<span class="ph">{g.name[0]}</span>
						{/if}
					</span>
					<div class="info">
						<strong>{g.name}</strong>
						<span class="meta">
							{#if g.pickedByName}
								<Avatar name={g.pickedByName} color={g.pickedByColor ?? '#ff6a2b'} size={16} />
								{g.pickedByName}'s pick ·
							{/if}
							{modeLabel(g.mode)}
						</span>
					</div>
					<div class="state">
						{#if g.status === 'finished'}
							<Badge tone="cool">✓ Done</Badge>
						{:else}
							<Button href="/competition/{id}/game/{g.cgId}">Continue →</Button>
						{/if}
					</div>
				</div>
			{/each}
			{#if data.games.length === 0}
				<p class="faint empty">No games picked yet — the first pick is coming up.</p>
			{/if}
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
					{#if s.controllerImage}
						<img class="ctrl" src="/controllers/{s.controllerImage}" alt="" title="weapon" />
					{/if}
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
	{#if status !== 'finished' && hasFinishedGame}
		<div class="end">
			{#if !confirmEnd}
				<button type="button" class="endlink" onclick={() => (confirmEnd = true)}>
					End competition early
				</button>
			{:else}
				<form method="POST" action="?/finishEarly" class="endconfirm">
					<span class="endq">End now &amp; crown the winner from games played so far?</span>
					<button type="submit" class="endgo">End &amp; see results →</button>
					<button type="button" class="endcancel" onclick={() => (confirmEnd = false)}>Cancel</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.head {
		margin-bottom: 1.6rem;
	}
	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.6rem;
		padding: 1rem 1.3rem;
		border: 1px solid #ff6a2b55;
		border-radius: var(--r-md);
		background: var(--accent-soft);
		box-shadow: var(--shadow-glow);
		transition: transform 0.2s var(--ease);
	}
	.banner:hover {
		transform: translateY(-2px);
	}
	.banner.weapons {
		border-color: #35e0c155;
		background: var(--cool-soft);
		box-shadow: 0 20px 60px -20px #35e0c140;
	}
	.banner .arrow {
		font-size: 1.2rem;
		color: var(--amber);
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
	.empty {
		font-size: 0.9rem;
		padding: 0.5rem 0;
	}
	.round {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.round.done {
		opacity: 0.75;
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
		gap: 0.15rem;
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
		display: flex;
		align-items: center;
		gap: 0.3rem;
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
	.ctrl {
		height: 26px;
		width: 38px;
		object-fit: contain;
		padding: 2px 4px;
		border-radius: 6px;
		background: radial-gradient(closest-side at 50% 45%, #ffffff40, #ffffff12 70%, transparent);
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.end {
		margin-left: auto;
	}
	.endlink {
		background: none;
		border: none;
		color: var(--text-faint);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.endlink:hover {
		color: var(--text-muted);
	}
	.endconfirm {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.endq {
		font-size: 0.82rem;
		color: var(--text-muted);
	}
	.endgo {
		padding: 0.45rem 0.9rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: #ff7089;
		background: #ff2d5518;
		border: 1px solid #ff2d5555;
		border-radius: var(--r-pill);
		cursor: pointer;
	}
	.endgo:hover {
		background: #ff2d5528;
	}
	.endcancel {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 0.82rem;
	}
	.endcancel:hover {
		color: var(--text-muted);
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
