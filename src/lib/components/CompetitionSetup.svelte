<script lang="ts">
	import { untrack } from 'svelte';
	import Button from './Button.svelte';
	import Avatar from './Avatar.svelte';
	import { colorForIndex } from '$lib/games';
	import type { CompetitionFormInitial } from '$lib/competition';

	let {
		suggestedName = 'Game Night',
		initial = {},
		errors = {}
	}: {
		suggestedName?: string;
		initial?: CompetitionFormInitial;
		errors?: Record<string, string>;
	} = $props();

	let name = $state(untrack(() => initial.name ?? suggestedName));
	let timeBudget = $state(untrack(() => initial.timeBudgetMinutes ?? 30));
	let gamesPerPlayer = $state(untrack(() => initial.gamesPerPlayer ?? 2));
	let competitors = $state<string[]>(
		untrack(() => (initial.competitorNames?.length ? [...initial.competitorNames] : ['', '']))
	);

	let competitorsJson = $derived(
		JSON.stringify(competitors.map((c) => c.trim()).filter(Boolean))
	);
	let validCount = $derived(competitors.filter((c) => c.trim()).length);
	let totalGames = $derived(validCount * gamesPerPlayer);

	function addCompetitor() {
		competitors.push('');
	}
	function removeCompetitor(i: number) {
		competitors.splice(i, 1);
	}
	function onCompetitorKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addCompetitor();
		}
	}
</script>

<form method="POST" class="setup stack">
	<section class="block">
		<div class="field">
			<label for="name">Competition name</label>
			<input id="name" name="name" type="text" bind:value={name} maxlength="120" required />
			{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
		</div>
	</section>

	<section class="block">
		<div class="block-head">
			<h2>Competitors</h2>
			<span class="count">{validCount} playing</span>
		</div>
		<div class="competitors stack">
			{#each competitors as _, i (i)}
				<div class="competitor-row">
					<Avatar name={competitors[i] || '?'} color={colorForIndex(i)} />
					<input
						type="text"
						placeholder="Player {i + 1}"
						bind:value={competitors[i]}
						onkeydown={onCompetitorKey}
						maxlength="40"
					/>
					<button
						type="button"
						class="icon-btn"
						onclick={() => removeCompetitor(i)}
						disabled={competitors.length <= 2}
						aria-label="Remove competitor"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
		<div class="add">
			<Button type="button" variant="ghost" onclick={addCompetitor}>+ Add competitor</Button>
		</div>
		{#if errors.competitorNames}<span class="field-error">{errors.competitorNames}</span>{/if}
	</section>

	<section class="block">
		<div class="block-head">
			<h2>Format</h2>
		</div>
		<span class="hint">
			No need to pick games now — each player picks the next game as the night unfolds.
		</span>
		<div class="settings">
			<div class="field">
				<label for="gamesPerPlayer">Games per player</label>
				<input id="gamesPerPlayer" name="gamesPerPlayer" type="number" min="1" max="10" bind:value={gamesPerPlayer} />
				{#if errors.gamesPerPlayer}<span class="field-error">{errors.gamesPerPlayer}</span>{/if}
			</div>
			<div class="field">
				<label for="timeBudgetMinutes">Target minutes per game</label>
				<input id="timeBudgetMinutes" name="timeBudgetMinutes" type="number" min="5" max="240" bind:value={timeBudget} />
			</div>
		</div>
		<div class="total">
			<span class="total-num gradient-text">{totalGames}</span>
			<span class="total-cap muted">games this night · {gamesPerPlayer} pick{gamesPerPlayer === 1 ? '' : 's'} each</span>
		</div>
	</section>

	<input type="hidden" name="competitorNames" value={competitorsJson} />

	<div class="actions row">
		<Button type="submit" size="lg">Pick your weapons →</Button>
		<Button href="/" variant="ghost" size="lg">Cancel</Button>
	</div>
</form>

<style>
	.setup {
		gap: 1.6rem;
		max-width: 620px;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.block-head h2 {
		font-size: 1.15rem;
	}
	.count {
		font-size: 0.82rem;
		color: var(--text-faint);
	}
	.competitor-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		flex-shrink: 0;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--bg-2);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.icon-btn:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border-strong);
	}
	.icon-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.settings {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.total {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-top: 0.3rem;
	}
	.total-num {
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 700;
	}
	.total-cap {
		font-size: 0.85rem;
	}
	.actions {
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	@media (max-width: 520px) {
		.settings {
			grid-template-columns: 1fr;
		}
	}
</style>
