<script lang="ts">
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { untrack } from 'svelte';
	import { modeLabel } from '$lib/games';
	import type { DisplayMatch } from '$lib/format/display';
	import type { FormatType } from '$lib/format/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const FORMAT_LABELS: Record<FormatType, string> = {
		single_match: 'Single match',
		round_robin: 'Round robin',
		single_elimination: 'Elimination bracket',
		double_elimination: 'Double elimination',
		heats_final: 'Heats → grand final',
		team_match: 'Team match',
		coop_score: 'Score attack'
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
</script>

<svelte:head>
	<title>{data.cg.name} — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow">
		<a class="back" href="/competition/{data.cg.competitionId}">Competition</a> · Set up game
	</span>
	<h1>{data.cg.name}</h1>
	<div class="chips">
		<Badge tone="accent">{modeLabel(data.cg.mode)}</Badge>
		<Badge>Up to {data.cg.maxPlayers} players</Badge>
		<Badge>~{data.cg.roundMinutes}m / round</Badge>
		<Badge>{data.competitors.length} competitors</Badge>
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
					<button
						type="button"
						class="opt"
						class:on={p.formatType === plan.formatType}
						onclick={() => (selectedFormat = p.formatType)}
					>
						<span class="opt-name">
							{FORMAT_LABELS[p.formatType]}
							{#if p.formatType === data.auto}<span class="rec">★</span>{/if}
						</span>
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
					{#if plan.formatType === data.auto && data.plans.length > 1}
						<Badge tone="cool">Recommended</Badge>
					{/if}
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
					<div class="match">
						<span class="mlabel">{m.label}</span>
						<div class="parts" class:duel={m.parts.length === 2}>
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
{:else}
	<Card padding="1.4rem" glow>
		<div class="summary">
			<div class="stack">
				<strong class="fmt-name">
					{data.cg.formatType ? FORMAT_LABELS[data.cg.formatType] : 'Set up'}
					<Badge tone="cool">✓ Ready</Badge>
				</strong>
				<span class="muted">{data.matches.length} matches · ~{data.cg.estimatedMinutes}m estimated</span>
			</div>
		</div>
	</Card>

	<div class="rounds">
		{#each groupByRound(data.matches) as [round, matches] (round)}
			<div class="round-group">
				{#each matches as m (m.label + m.parts.join())}
					<div class="match">
						<span class="mlabel">{m.label}</span>
						<div class="parts" class:duel={m.parts.length === 2}>
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

	<Card padding="1.1rem">
		<div class="next">
			<span class="muted">Result entry &amp; 3·2·1 scoring arrive in <strong>Phase 5</strong>.</span>
			<div class="next-actions">
				<form method="POST" action="?/reset">
					<Button type="submit" variant="ghost">Change format</Button>
				</form>
				<Button href="/competition/{data.cg.competitionId}">Back to competition →</Button>
			</div>
		</div>
	</Card>
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
	.match {
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
	.next {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.next-actions {
		display: flex;
		gap: 0.6rem;
	}

	@media (max-width: 560px) {
		.match {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
