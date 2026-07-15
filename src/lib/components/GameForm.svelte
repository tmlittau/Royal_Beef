<script lang="ts">
	import { untrack } from 'svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import SteamImport from './SteamImport.svelte';
	import type { SteamAppDetails } from '$lib/steam';
	import {
		MODES,
		SCORING_TYPES,
		STAT_TYPES,
		AGGREGATES,
		type GameFormInitial,
		type StatRow
	} from '$lib/games';

	let {
		initial = {},
		errors = {},
		submitLabel = 'Save game',
		action = undefined
	}: {
		initial?: GameFormInitial;
		errors?: Record<string, string>;
		submitLabel?: string;
		action?: string;
	} = $props();

	// Initialise once from the incoming prop; the form re-mounts on submit/redirect.
	let name = $state(untrack(() => initial.name ?? ''));
	let description = $state(untrack(() => initial.description ?? ''));
	let coverUrl = $state(untrack(() => initial.coverUrl ?? ''));
	let supportedModes = $state<string[]>(untrack(() => initial.supportedModes ?? ['ffa']));
	let defaultMode = $state(untrack(() => initial.defaultMode ?? 'ffa'));
	let statDefs = $state<StatRow[]>(
		untrack(() => (initial.statDefinitions ?? []).map((s) => ({ ...s })))
	);

	let hasTeams = $derived(supportedModes.includes('teams'));
	let availableDefaults = $derived(MODES.filter((m) => supportedModes.includes(m.value)));

	// Keep the default mode valid as the mode selection changes.
	$effect(() => {
		if (supportedModes.length && !supportedModes.includes(defaultMode)) {
			defaultMode = supportedModes[0];
		}
	});

	let statJson = $derived(JSON.stringify(statDefs));

	function addStat() {
		statDefs.push({ label: '', type: 'count', aggregate: 'sum', higherIsBetter: true });
	}
	function removeStat(i: number) {
		statDefs.splice(i, 1);
	}

	function handleImport(d: SteamAppDetails) {
		if (d.name) name = d.name;
		if (d.description) description = d.description;
		if (d.coverUrl) coverUrl = d.coverUrl;
		if (d.modeHints?.length) {
			supportedModes = [...new Set(d.modeHints)];
			defaultMode = supportedModes[0];
		}
	}
</script>

<div class="game-form stack">
	<SteamImport onimport={handleImport} />

	<form method="POST" {action} class="fields stack">
		<div class="grid-2">
			<div class="field span-2">
				<label for="name">Name</label>
				<input id="name" name="name" type="text" bind:value={name} placeholder="e.g. Gang Beasts" required />
				{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
			</div>

			<div class="field span-2">
				<label for="description">Description</label>
				<textarea id="description" name="description" placeholder="One-line description" bind:value={description}></textarea>
			</div>

			<div class="field span-2">
				<span class="field-label">Cover image</span>
				{#if coverUrl}
					<div class="cover-preview">
						<img src={coverUrl} alt="Cover preview" />
						<button type="button" class="clear" onclick={() => (coverUrl = '')}>Remove</button>
					</div>
				{/if}
				<input id="coverUrl" name="coverUrl" type="text" bind:value={coverUrl} placeholder="Import from Steam above, or paste an image URL" />
				{#if errors.coverUrl}<span class="field-error">{errors.coverUrl}</span>{/if}
			</div>

		<div class="field">
			<label for="minPlayers">Min players</label>
			<input id="minPlayers" name="minPlayers" type="number" min="1" max="64" value={initial.minPlayers ?? 2} />
		</div>
		<div class="field">
			<label for="maxPlayers">Max players (local)</label>
			<input id="maxPlayers" name="maxPlayers" type="number" min="1" max="64" value={initial.maxPlayers ?? 4} />
			{#if errors.maxPlayers}<span class="field-error">{errors.maxPlayers}</span>{/if}
		</div>
		<div class="field">
			<label for="defaultRoundMinutes">Round length (min)</label>
			<input id="defaultRoundMinutes" name="defaultRoundMinutes" type="number" min="1" max="240" value={initial.defaultRoundMinutes ?? 5} />
		</div>
		<div class="field">
			<label for="scoringType">Scoring</label>
			<select id="scoringType" name="scoringType" value={initial.scoringType ?? 'placement'}>
				{#each SCORING_TYPES as s}
					<option value={s.value}>{s.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="field">
		<span class="field-label">Supported modes</span>
		<div class="modes">
			{#each MODES as m}
				<label class="check" class:on={supportedModes.includes(m.value)}>
					<input type="checkbox" name="supportedModes" value={m.value} bind:group={supportedModes} />
					<span>{m.label}</span>
				</label>
			{/each}
		</div>
		{#if errors.supportedModes}<span class="field-error">{errors.supportedModes}</span>{/if}
	</div>

	<div class="grid-2">
		<div class="field">
			<label for="defaultMode">Default mode</label>
			<select id="defaultMode" name="defaultMode" bind:value={defaultMode}>
				{#each availableDefaults as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
			{#if errors.defaultMode}<span class="field-error">{errors.defaultMode}</span>{/if}
		</div>
		{#if hasTeams}
			<div class="field">
				<label for="teamSize">Team size</label>
				<input id="teamSize" name="teamSize" type="number" min="2" max="16" value={initial.teamSize ?? 2} />
				{#if errors.teamSize}<span class="field-error">{errors.teamSize}</span>{/if}
			</div>
		{/if}
	</div>

	<!-- Stat editor -->
	<div class="field">
		<span class="field-label">Tracked stats</span>
		<span class="hint">Game-specific numbers players report during a match (e.g. KOs, best lap).</span>
		<Card padding="0.9rem">
			<div class="stats stack">
				{#if statDefs.length === 0}
					<p class="faint empty">No stats yet — add one below.</p>
				{/if}
				{#each statDefs as stat, i (i)}
					<div class="stat-row">
						<input class="stat-label" type="text" placeholder="Stat name (e.g. KOs)" bind:value={stat.label} />
						<select bind:value={stat.type} aria-label="Type">
							{#each STAT_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
						</select>
						<select bind:value={stat.aggregate} aria-label="Aggregate">
							{#each AGGREGATES as a}<option value={a.value}>{a.label}</option>{/each}
						</select>
						<label class="hib" title="Higher is better">
							<input type="checkbox" bind:checked={stat.higherIsBetter} />
							<span>↑ better</span>
						</label>
						<button type="button" class="remove" onclick={() => removeStat(i)} aria-label="Remove stat">✕</button>
					</div>
				{/each}
				<div>
					<Button type="button" variant="ghost" onclick={addStat}>+ Add stat</Button>
				</div>
			</div>
		</Card>
		<input type="hidden" name="statDefinitions" value={statJson} />
	</div>

	<div class="field">
		<label for="notes">Notes</label>
		<textarea id="notes" name="notes" placeholder="House rules, reminders…">{initial.notes ?? ''}</textarea>
	</div>

	<div class="actions row">
		<Button type="submit" size="lg">{submitLabel}</Button>
		<Button href="/library" variant="ghost" size="lg">Cancel</Button>
	</div>
	</form>
</div>

<style>
	.game-form {
		gap: 1.4rem;
		max-width: 760px;
	}
	.fields {
		gap: 1.4rem;
	}
	.cover-preview {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.2rem;
	}
	.cover-preview img {
		width: 200px;
		max-width: 55%;
		aspect-ratio: 460 / 215;
		object-fit: cover;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-sm);
	}
	.cover-preview .clear {
		padding: 0.35rem 0.7rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		background: var(--bg-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-pill);
		cursor: pointer;
	}
	.cover-preview .clear:hover {
		color: #ff6a86;
		border-color: #ff2d5566;
	}
	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.span-2 {
		grid-column: 1 / -1;
	}

	.modes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.85rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-pill);
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--text-muted);
		transition: all 0.18s var(--ease);
	}
	.check.on {
		color: var(--text);
		border-color: #ff6a2b66;
		background: var(--accent-soft);
	}
	.check input {
		accent-color: var(--accent);
		width: 1rem;
		height: 1rem;
	}

	.stats {
		gap: 0.6rem;
	}
	.empty {
		font-size: 0.85rem;
		padding: 0.3rem 0;
	}
	.stat-row {
		display: grid;
		grid-template-columns: 1fr 7rem 7rem auto auto;
		gap: 0.5rem;
		align-items: center;
	}
	.hib {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.hib input {
		accent-color: var(--cool);
	}
	.remove {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--bg-2);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.18s var(--ease);
	}
	.remove:hover {
		color: #ff6a86;
		border-color: #ff2d5566;
	}

	.actions {
		gap: 0.6rem;
		margin-top: 0.3rem;
	}

	@media (max-width: 620px) {
		.grid-2 {
			grid-template-columns: 1fr;
		}
		.stat-row {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
