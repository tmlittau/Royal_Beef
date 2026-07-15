<script lang="ts">
	import { untrack } from 'svelte';
	import Button from './Button.svelte';
	import Avatar from './Avatar.svelte';
	import { colorForIndex, modeLabel, playerRange } from '$lib/games';
	import type { CompetitionFormInitial } from '$lib/competition';
	import type { Game } from '$lib/server/db/schema';

	let {
		games,
		suggestedName = 'Game Night',
		initial = {},
		errors = {}
	}: {
		games: Game[];
		suggestedName?: string;
		initial?: CompetitionFormInitial;
		errors?: Record<string, string>;
	} = $props();

	let name = $state(untrack(() => initial.name ?? suggestedName));
	let timeBudget = $state(untrack(() => initial.timeBudgetMinutes ?? 30));
	let competitors = $state<string[]>(
		untrack(() => (initial.competitorNames?.length ? [...initial.competitorNames] : ['', '']))
	);
	let selected = $state<number[]>(untrack(() => (initial.gameIds ? [...initial.gameIds] : [])));

	let competitorsJson = $derived(
		JSON.stringify(competitors.map((c) => c.trim()).filter(Boolean))
	);
	let gameIdsJson = $derived(JSON.stringify(selected));
	let validCount = $derived(competitors.filter((c) => c.trim()).length);

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

	function toggleGame(id: number) {
		const i = selected.indexOf(id);
		if (i === -1) selected.push(id);
		else selected.splice(i, 1);
	}
	function moveGame(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= selected.length) return;
		[selected[i], selected[j]] = [selected[j], selected[i]];
	}
	function gameById(id: number) {
		return games.find((g) => g.id === id);
	}
</script>

<form method="POST" class="setup stack">
	<!-- Name -->
	<section class="block">
		<div class="field">
			<label for="name">Competition name</label>
			<input id="name" name="name" type="text" bind:value={name} maxlength="120" required />
			{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
		</div>
	</section>

	<!-- Competitors -->
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

	<!-- Games -->
	<section class="block">
		<div class="block-head">
			<h2>Games</h2>
			<span class="count">{selected.length} selected</span>
		</div>
		<span class="hint">Tap to add. They'll be played in the order below.</span>

		<div class="game-grid">
			{#each games as g (g.id)}
				{@const pos = selected.indexOf(g.id)}
				<button
					type="button"
					class="pick"
					class:on={pos !== -1}
					onclick={() => toggleGame(g.id)}
				>
					<span class="thumb">
						{#if g.coverUrl}
							<img src={g.coverUrl} alt="" loading="lazy" />
						{:else}
							<span class="ph">{g.name[0]}</span>
						{/if}
						{#if pos !== -1}<span class="badge-num">{pos + 1}</span>{/if}
					</span>
					<span class="pick-name">{g.name}</span>
					<span class="pick-meta">{playerRange(g.minPlayers, g.maxPlayers)}p · {modeLabel(g.defaultMode)}</span>
				</button>
			{/each}
		</div>
		{#if errors.gameIds}<span class="field-error">{errors.gameIds}</span>{/if}

		{#if selected.length}
			<div class="order">
				<h3>Playing order</h3>
				<ol>
					{#each selected as gid, i (gid)}
						<li>
							<span class="num">{i + 1}</span>
							<span class="oname">{gameById(gid)?.name}</span>
							<div class="ctrls">
								<button type="button" class="icon-btn" onclick={() => moveGame(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
								<button type="button" class="icon-btn" onclick={() => moveGame(i, 1)} disabled={i === selected.length - 1} aria-label="Move down">↓</button>
								<button type="button" class="icon-btn" onclick={() => toggleGame(gid)} aria-label="Remove">✕</button>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</section>

	<!-- Settings -->
	<section class="block">
		<div class="field budget">
			<label for="timeBudgetMinutes">Target minutes per game</label>
			<input id="timeBudgetMinutes" name="timeBudgetMinutes" type="number" min="5" max="240" bind:value={timeBudget} />
			<span class="hint">Guides the format engine toward time-feasible tournaments (Phase 4).</span>
		</div>
	</section>

	<input type="hidden" name="competitorNames" value={competitorsJson} />
	<input type="hidden" name="gameIds" value={gameIdsJson} />

	<div class="actions row">
		<Button type="submit" size="lg">Start competition →</Button>
		<Button href="/" variant="ghost" size="lg">Cancel</Button>
	</div>
</form>

<style>
	.setup {
		gap: 1.6rem;
		max-width: 820px;
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
	.add {
		margin-top: 0.1rem;
	}

	.game-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.7rem;
	}
	.pick {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.pick:hover {
		border-color: var(--border-strong);
	}
	.pick.on {
		border-color: #ff6a2b99;
		background: var(--accent-soft);
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
	.badge-num {
		position: absolute;
		top: 0.3rem;
		left: 0.3rem;
		display: grid;
		place-items: center;
		min-width: 1.4rem;
		height: 1.4rem;
		padding: 0 0.3rem;
		font-size: 0.78rem;
		font-weight: 700;
		color: #1a0a02;
		background: var(--accent-grad);
		border-radius: var(--r-pill);
	}
	.pick-name {
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pick-meta {
		font-size: 0.74rem;
		color: var(--text-faint);
	}

	.order {
		margin-top: 0.4rem;
		padding: 1rem 1.1rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.order h3 {
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: 0.6rem;
	}
	.order ol {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.order li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.order .num {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		flex-shrink: 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--amber);
		background: var(--accent-soft);
		border-radius: var(--r-pill);
	}
	.order .oname {
		flex: 1;
	}
	.order .ctrls {
		display: flex;
		gap: 0.3rem;
	}
	.order .icon-btn {
		width: 1.9rem;
		height: 1.9rem;
	}

	.budget {
		max-width: 320px;
	}

	.actions {
		gap: 0.6rem;
		margin-top: 0.4rem;
	}
</style>
