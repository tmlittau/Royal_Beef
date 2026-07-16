<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Confetti from '$lib/components/Confetti.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const champions = $derived(
		data.results.standings.filter((s) => data.results.championIds.includes(s.competitorId))
	);
	const podium = $derived(data.results.standings.slice(0, 3));
	const medal = ['🥇', '🥈', '🥉'];

	function print() {
		window.print();
	}
</script>

<svelte:head>
	<title>{data.competition.name} — Champion — Royal Beef</title>
</svelte:head>

<Confetti />

<div class="stack hero">
	<span class="eyebrow">🏁 Final results · {data.competition.name}</span>

	<div class="champ">
		<span class="crown">🏆</span>
		<span class="champ-label">{champions.length > 1 ? 'Co-champions' : 'Champion'}</span>
		<div class="champ-names">
			{#each champions as c (c.competitorId)}
				<div class="champ-one">
					<Avatar name={c.name} color={c.color} size={80} />
					<span class="champ-name gradient-text">{c.name}</span>
					<span class="champ-pts">{c.points} pts</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Podium -->
<Card padding="1.8rem" glow>
	<div class="podium">
		{#each podium as p, i (p.competitorId)}
			<div class="pod" class:first={i === 0}>
				<span class="pod-medal">{medal[i]}</span>
				<Avatar name={p.name} color={p.color} size={i === 0 ? 58 : 46} />
				<span class="pod-name">{p.name}</span>
				<span class="pod-pts gradient-text">{p.points}</span>
				<span class="pod-sub faint">{p.firsts} win{p.firsts === 1 ? '' : 's'}</span>
			</div>
		{/each}
	</div>
</Card>

<!-- Highlights -->
{#if data.results.highlights.length}
	<section class="block">
		<h2 class="section-title">Highlights</h2>
		<div class="highlights">
			{#each data.results.highlights as h (h.key)}
				<div class="hl">
					<span class="hl-label">{h.label}</span>
					<div class="hl-body">
						<Avatar name={h.name} color={h.color} size={30} />
						<div class="hl-who">
							<span class="hl-name">{h.name}</span>
							<span class="hl-value">{h.value}</span>
						</div>
					</div>
					{#if h.sub}<span class="hl-sub faint">{h.sub}</span>{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- Full standings -->
<section class="block">
	<h2 class="section-title">Final standings</h2>
	<div class="table">
		<div class="thead">
			<span class="c-rank">#</span>
			<span class="c-name">Player</span>
			<span class="c-num">Wins</span>
			<span class="c-num">Podiums</span>
			<span class="c-pts">Points</span>
		</div>
		{#each data.results.standings as s (s.competitorId)}
			<div class="trow" class:lead={s.rank === 1}>
				<span class="c-rank">{s.rank}</span>
				<span class="c-name"><Avatar name={s.name} color={s.color} size={28} /> {s.name}</span>
				<span class="c-num">{s.firsts}</span>
				<span class="c-num">{s.podiums}</span>
				<span class="c-pts">{s.points}</span>
			</div>
		{/each}
	</div>
</section>

<div class="actions">
	<Button href="/" size="lg">← Dashboard</Button>
	<Button variant="ghost" size="lg" onclick={print}>Print / save</Button>
</div>

<style>
	.hero {
		align-items: center;
		text-align: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.champ {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.crown {
		font-size: 2.6rem;
		filter: drop-shadow(0 6px 18px #ff5a2860);
	}
	.champ-label {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--text-muted);
	}
	.champ-names {
		display: flex;
		gap: 2.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.champ-one {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.champ-name {
		font-family: var(--font-display);
		font-size: clamp(2rem, 6vw, 3.4rem);
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.champ-pts {
		font-size: 1rem;
		color: var(--text-muted);
	}

	.podium {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: clamp(1.2rem, 6vw, 3rem);
	}
	.pod {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}
	.pod.first {
		transform: translateY(-10px);
	}
	.pod-medal {
		font-size: 1.6rem;
	}
	.pod-name {
		font-weight: 600;
	}
	.pod-pts {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.5rem;
	}
	.pod-sub {
		font-size: 0.75rem;
	}

	.block {
		margin-top: 2.2rem;
	}
	.section-title {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted);
		margin-bottom: 1rem;
	}
	.highlights {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.9rem;
	}
	.hl {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.hl-label {
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-faint);
	}
	.hl-body {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.hl-who {
		display: flex;
		flex-direction: column;
	}
	.hl-name {
		font-weight: 600;
	}
	.hl-value {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--amber);
	}
	.hl-sub {
		font-size: 0.75rem;
	}

	.table {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		overflow: hidden;
	}
	.thead,
	.trow {
		display: grid;
		grid-template-columns: 2.5rem 1fr 4rem 5rem 4.5rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.9rem;
	}
	.thead {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-faint);
		background: var(--bg-2);
	}
	.trow {
		border-top: 1px solid var(--border);
	}
	.trow.lead {
		background: var(--accent-soft);
	}
	.c-name {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.c-num,
	.c-pts {
		text-align: right;
	}
	.c-pts {
		font-family: var(--font-display);
		font-weight: 700;
	}

	.actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 2rem;
	}

	@media print {
		.actions {
			display: none;
		}
	}
</style>
