<script lang="ts">
	import { untrack } from 'svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import MatchResult from '$lib/components/MatchResult.svelte';
	import { modeLabel } from '$lib/games';
	import type { DisplayMatch } from '$lib/format/display';
	import type { FormatType } from '$lib/format/types';
	import type { RunnerParticipant } from '$lib/server/results';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const FORMAT_LABELS: Record<FormatType, string> = {
		single_match: 'Single match',
		round_robin: 'Round robin',
		single_elimination: 'Elimination bracket',
		double_elimination: 'Double elimination',
		heats_final: 'Heats → grand final',
		team_match: 'Team match',
		coop_score: 'Score attack',
		one_vs_all: 'One vs all'
	};

	let selectedFormat = $state<FormatType | undefined>(
		untrack(() => (data.view === 'preview' ? data.auto : undefined))
	);

	function groupByRound(ms: DisplayMatch[]): [number, DisplayMatch[]][] {
		const map = new Map<number, DisplayMatch[]>();
		for (const m of ms) {
			const a = map.get(m.round) ?? [];
			a.push(m);
			map.set(m.round, a);
		}
		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	}

	const medal = (place: number | null) => (place && place <= 3 ? ['🥇', '🥈', '🥉'][place - 1] : place);
	const byPlace = (ps: RunnerParticipant[]) =>
		[...ps].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
</script>

<svelte:head>
	<title>{data.cg.name} — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow">
		<a class="back" href="/competition/{data.cg.competitionId}">Competition</a> ·
		{data.view === 'finished' ? 'Result' : data.view === 'run' ? 'Playing' : 'Set up game'}
	</span>
	<h1>{data.cg.name}</h1>
	<div class="chips">
		<Badge tone="accent">{modeLabel(data.cg.mode)}</Badge>
		<Badge>Up to {data.cg.maxPlayers} players</Badge>
		<Badge>~{data.cg.roundMinutes}m / round</Badge>
	</div>
</div>

{#if data.view === 'preview'}
	{@const plan = data.plans.find((p) => p.formatType === selectedFormat) ?? data.plans[0]}
	{@const budget = data.competition?.timeBudgetMinutes ?? 30}
	{@const over = plan.estimateMinutes > budget}

	{#if data.plans.length > 1}
		<div class="switcher">
			<span class="field-label">Format</span>
			<div class="options">
				{#each data.plans as p (p.formatType)}
					<button type="button" class="opt" class:on={p.formatType === plan.formatType} onclick={() => (selectedFormat = p.formatType)}>
						<span class="opt-name">{FORMAT_LABELS[p.formatType]}{#if p.formatType === data.auto}<span class="rec"> ★</span>{/if}</span>
						<span class="opt-est">{p.matchCount} matches · ~{p.estimateMinutes}m</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<Card padding="1.4rem">
		<div class="summary">
			<div class="stack">
				<strong class="fmt-name">
					{FORMAT_LABELS[plan.formatType]}
					{#if plan.formatType === data.auto && data.plans.length > 1}<Badge tone="cool">Recommended</Badge>{/if}
				</strong>
				<span class="muted">{plan.rationale}</span>
			</div>
			<div class="est" class:over>
				<span class="est-num">~{plan.estimateMinutes}m</span>
				<span class="est-cap">{over ? `over ${budget}m target` : `within ${budget}m target`}</span>
			</div>
		</div>
	</Card>

	<div class="rounds">
		{#each groupByRound(plan.display) as [round, matches] (round)}
			<div class="round-group">
				{#each matches as m (m.label + m.parts.join())}
					<div class="pmatch">
						<span class="mlabel">{m.label}</span>
						<div class="parts">
							{#each m.parts as part, i (i)}
								<span class="part">{part}</span>
								{#if m.parts.length === 2 && i === 0}<span class="vs">vs</span>{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<form method="POST" action="?/confirm" class="confirm">
		<input type="hidden" name="formatType" value={plan.formatType} />
		<Button type="submit" size="lg">Confirm &amp; set up →</Button>
		<Button href="/competition/{data.cg.competitionId}" variant="ghost" size="lg">Back</Button>
	</form>
{:else if data.view === 'run'}
	{@const current = data.runner.matches.find((m) => m.id === data.runner.currentMatchId)}
	<div class="progress">
		<Badge tone="accent">{FORMAT_LABELS[data.cg.formatType ?? 'single_match']}</Badge>
		<span class="muted">{data.runner.done} of {data.runner.total} matches done</span>
	</div>

	{#if current?.label.startsWith('Tiebreaker')}
		<div class="tiebreak">
			⚔️ <strong>Sudden-death tiebreaker.</strong> The standings can't split these players — play it off.
		</div>
	{/if}

	{#if current}
		<Card padding="1.4rem" glow>
			<MatchResult match={current} statDefs={data.statDefs} scoringType={data.cg.scoringType} />
		</Card>
	{/if}

	<div class="mlist">
		{#each data.runner.matches as m (m.id)}
			<div class="mrow" class:current={m.id === data.runner.currentMatchId} class:done={m.status === 'finished'}>
				<span class="mrow-label">{m.label}</span>
				{#if m.status === 'finished'}
					<div class="parts">
						{#each byPlace(m.participants) as p (p.pid)}
							<span class="part">{medal(p.placement)} {p.name}</span>
						{/each}
					</div>
				{:else}
					<div class="parts">
						{#each m.participants as p (p.pid)}
							<span class="part" class:tbd={!p.competitorId}>{p.name ?? p.sourceLabel}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="foot">
		<Button href="/competition/{data.cg.competitionId}" variant="ghost">← Back to competition</Button>
	</div>
{:else}
	<!-- finished -->
	{@const podium = data.results.slice(0, 3)}
	<Card padding="1.6rem" glow>
		<div class="podium">
			{#each podium as r, i (r.competitorId)}
				<div class="pod" class:first={i === 0}>
					<span class="medal">{['🥇', '🥈', '🥉'][i]}</span>
					<Avatar name={r.name} color={r.color} size={i === 0 ? 52 : 42} />
					<span class="pod-name">{r.name}</span>
					<span class="pod-pts gradient-text">+{r.points}</span>
				</div>
			{/each}
		</div>
	</Card>

	<div class="results">
		<h2 class="section-title">Full result</h2>
		<div class="rtable">
			{#each data.results as r (r.competitorId)}
				<div class="rrow">
					<span class="rrank">{r.rank}</span>
					<Avatar name={r.name} color={r.color} size={28} />
					<span class="rname">{r.name}</span>
					<span class="rpts">{r.points ? `+${r.points}` : '—'}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="foot">
		<Button href="/competition/{data.cg.competitionId}" size="lg">Back to competition →</Button>
	</div>
{/if}

<style>
	.head {
		gap: 0.6rem;
		margin-bottom: 1.6rem;
	}
	h1 {
		font-size: clamp(2rem, 4.5vw, 3rem);
	}
	.chips {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.back {
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.back:hover {
		color: var(--text);
	}

	/* preview */
	.switcher {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.1rem;
	}
	.options {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.opt {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.7rem 1rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.opt:hover {
		background: var(--surface-hover);
	}
	.opt.on {
		border-color: #ff6a2b99;
		background: var(--accent-soft);
	}
	.opt-name {
		font-weight: 600;
	}
	.rec {
		color: var(--amber);
	}
	.opt-est {
		font-size: 0.78rem;
		color: var(--text-faint);
	}
	.summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.fmt-name {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--font-display);
		font-size: 1.15rem;
	}
	.est {
		text-align: right;
		display: flex;
		flex-direction: column;
	}
	.est-num {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.3rem;
		color: var(--cool);
	}
	.est.over .est-num {
		color: var(--amber);
	}
	.est-cap {
		font-size: 0.74rem;
		color: var(--text-faint);
	}
	.rounds {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin: 1.3rem 0;
	}
	.round-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.pmatch {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 0.95rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.mlabel {
		flex-shrink: 0;
		min-width: 8.5rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-muted);
	}
	.parts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.part {
		padding: 0.25rem 0.6rem;
		font-size: 0.85rem;
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-pill);
	}
	.part.tbd {
		color: var(--text-faint);
		font-style: italic;
	}
	.vs {
		font-size: 0.75rem;
		color: var(--text-faint);
		font-weight: 600;
	}
	.confirm {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}

	/* runner */
	.progress {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 1rem;
	}
	.tiebreak {
		margin-bottom: 1rem;
		padding: 0.8rem 1.1rem;
		border: 1px solid #ff2d5544;
		border-radius: var(--r-md);
		background: linear-gradient(120deg, #ff2d5514, #ff6a2b14);
		font-size: 0.92rem;
		color: var(--text);
	}
	.tiebreak strong {
		color: var(--amber);
	}
	.mlist {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 1.3rem 0;
	}
	.mrow {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
		flex-wrap: wrap;
	}
	.mrow.current {
		border-color: #ff6a2b66;
	}
	.mrow.done {
		opacity: 0.75;
	}
	.mrow-label {
		flex-shrink: 0;
		min-width: 8rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	/* finished */
	.podium {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: clamp(1rem, 5vw, 2.5rem);
		padding: 0.5rem 0;
	}
	.pod {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.pod .medal {
		font-size: 1.5rem;
	}
	.pod.first {
		transform: translateY(-8px);
	}
	.pod-name {
		font-weight: 600;
	}
	.pod-pts {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.3rem;
	}
	.results {
		margin: 1.6rem 0;
	}
	.section-title {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted);
		margin-bottom: 0.8rem;
	}
	.rtable {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		max-width: 460px;
	}
	.rrow {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.5rem;
		border-radius: var(--r-sm);
	}
	.rrank {
		width: 1.4rem;
		text-align: center;
		font-weight: 700;
		color: var(--text-faint);
	}
	.rname {
		flex: 1;
	}
	.rpts {
		font-family: var(--font-display);
		font-weight: 700;
	}
	.foot {
		margin-top: 1.5rem;
	}
</style>
