<script lang="ts">
	import Avatar from './Avatar.svelte';
	import Button from './Button.svelte';
	import type { StatDef } from '$lib/server/db/schema';
	import type { RunnerMatch } from '$lib/server/results';

	let {
		match,
		statDefs = [],
		scoringType = 'placement'
	}: { match: RunnerMatch; statDefs?: StatDef[]; scoringType?: string } = $props();

	const players = $derived(match.participants.filter((p) => p.competitorId !== null));
	const n = $derived(players.length);
	const mode = $derived(
		match.kind === 'score'
			? 'score'
			: match.kind === 'team'
				? 'team'
				: match.kind === 'solo'
					? 'solo'
					: 'rank'
	);

	// solo mode: team 0 is the lone player, team 1 is the pack
	const soloPlayer = $derived(players.find((p) => (p.team ?? 0) === 0) ?? null);
	const packPlayers = $derived(players.filter((p) => (p.team ?? 0) === 1));

	// rank mode: finishing order of competitor ids
	let order = $state<number[]>([]);
	function tap(id: number) {
		const i = order.indexOf(id);
		if (i >= 0) order.splice(i, 1);
		else order.push(id);
	}
	function placementOf(id: number): number | null {
		const i = order.indexOf(id);
		if (i >= 0) return i + 1;
		if (order.length === n - 1) return n; // the last unranked player auto-fills last place
		return null;
	}

	// score + team + stats state
	let scores = $state<Record<number, string>>({});
	let winningTeam = $state<number | null>(null);
	let stats = $state<Record<number, Record<string, string>>>({});

	function setScore(id: number, v: string) {
		scores[id] = v;
	}
	function setStat(id: number, key: string, v: string) {
		(stats[id] ??= {})[key] = v;
	}

	const teams = $derived.by(() => {
		const map = new Map<number, typeof players>();
		for (const p of players) {
			const t = p.team ?? 0;
			const arr = map.get(t) ?? [];
			arr.push(p);
			map.set(t, arr);
		}
		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	});

	function statsFor(id: number): Record<string, number> {
		const out: Record<string, number> = {};
		for (const sd of statDefs) {
			const v = stats[id]?.[sd.key];
			if (v !== undefined && v !== '') out[sd.key] = Number(v);
		}
		return out;
	}

	const complete = $derived.by(() => {
		if (mode === 'score') return players.every((p) => (scores[p.competitorId!] ?? '') !== '');
		if (mode === 'team' || mode === 'solo') return winningTeam !== null;
		return n >= 1 && order.length >= n - 1;
	});

	const entries = $derived.by(() => {
		if (mode === 'score') {
			const lower = scoringType === 'time';
			const ranked = players
				.map((p) => ({ id: p.competitorId!, s: scores[p.competitorId!] }))
				.filter((x) => x.s !== undefined && x.s !== '')
				.sort((a, b) => (lower ? Number(a.s) - Number(b.s) : Number(b.s) - Number(a.s)));
			const place = new Map(ranked.map((x, i) => [x.id, i + 1]));
			return players.map((p) => ({
				competitorId: p.competitorId!,
				placement: place.get(p.competitorId!) ?? n,
				score: (scores[p.competitorId!] ?? '') === '' ? null : Number(scores[p.competitorId!]),
				stats: statsFor(p.competitorId!)
			}));
		}
		if (mode === 'team' || mode === 'solo') {
			return players.map((p) => ({
				competitorId: p.competitorId!,
				placement: (p.team ?? 0) === winningTeam ? 1 : 2,
				stats: statsFor(p.competitorId!)
			}));
		}
		return players.map((p) => ({
			competitorId: p.competitorId!,
			placement: placementOf(p.competitorId!) ?? 0,
			stats: statsFor(p.competitorId!)
		}));
	});

	const entriesJson = $derived(JSON.stringify(complete ? entries : []));
	const medal = ['🥇', '🥈', '🥉'];
</script>

<form method="POST" action="?/saveMatch" class="result">
	<input type="hidden" name="matchId" value={match.id} />
	<input type="hidden" name="entries" value={entriesJson} />

	<div class="rlabel">{match.label}</div>

	{#if mode === 'rank'}
		<p class="hint">Tap players in finishing order (1st, 2nd, …).</p>
		<div class="rows">
			{#each players as p (p.competitorId)}
				{@const place = placementOf(p.competitorId!)}
				<div class="row" class:ranked={place !== null}>
					<button type="button" class="tap" onclick={() => tap(p.competitorId!)}>
						<span class="pos">{place ? (medal[place - 1] ?? place) : '·'}</span>
						<Avatar name={p.name ?? '?'} color={p.color ?? '#ff6a2b'} size={30} />
						<span class="pname">{p.name}</span>
					</button>
					{#if statDefs.length}
						<div class="stats">
							{#each statDefs as sd (sd.key)}
								<input
									type="number"
									step="any"
									placeholder={sd.label}
									value={stats[p.competitorId!]?.[sd.key] ?? ''}
									oninput={(e) => setStat(p.competitorId!, sd.key, e.currentTarget.value)}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		{#if order.length}
			<button type="button" class="link" onclick={() => (order = [])}>Reset order</button>
		{/if}
	{:else if mode === 'solo'}
		<p class="hint">Did the solo player beat the pack, or did the pack stop them?</p>
		<div class="solo">
			<button
				type="button"
				class="sidecard"
				class:won={winningTeam === 0}
				onclick={() => (winningTeam = 0)}
			>
				<span class="tlabel">Solo{winningTeam === 0 ? ' 🏆' : ''}</span>
				{#if soloPlayer}
					<span class="tm big">
						<Avatar name={soloPlayer.name ?? '?'} color={soloPlayer.color ?? '#ff6a2b'} size={40} />
						{soloPlayer.name}
					</span>
				{/if}
			</button>
			<span class="vs">vs</span>
			<button
				type="button"
				class="sidecard"
				class:won={winningTeam === 1}
				onclick={() => (winningTeam = 1)}
			>
				<span class="tlabel">The pack{winningTeam === 1 ? ' 🏆' : ''}</span>
				<div class="tmembers">
					{#each packPlayers as p (p.competitorId)}
						<span class="tm"><Avatar name={p.name ?? '?'} color={p.color ?? '#ff6a2b'} size={24} /> {p.name}</span>
					{/each}
				</div>
			</button>
		</div>
	{:else if mode === 'team'}
		<p class="hint">Tap the winning team.</p>
		<div class="teams">
			{#each teams as [t, members] (t)}
				<button
					type="button"
					class="teamcard"
					class:won={winningTeam === t}
					onclick={() => (winningTeam = t)}
				>
					<span class="tlabel">Team {String.fromCharCode(65 + t)}{winningTeam === t ? ' 🏆' : ''}</span>
					<div class="tmembers">
						{#each members as p (p.competitorId)}
							<span class="tm"><Avatar name={p.name ?? '?'} color={p.color ?? '#ff6a2b'} size={24} /> {p.name}</span>
						{/each}
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<p class="hint">Enter each player's score.</p>
		<div class="rows">
			{#each players as p (p.competitorId)}
				<div class="row">
					<div class="who"><Avatar name={p.name ?? '?'} color={p.color ?? '#ff6a2b'} size={30} /> <span class="pname">{p.name}</span></div>
					<input
						class="score"
						type="number"
						step="any"
						placeholder="Score"
						value={scores[p.competitorId!] ?? ''}
						oninput={(e) => setScore(p.competitorId!, e.currentTarget.value)}
					/>
					{#if statDefs.length}
						<div class="stats">
							{#each statDefs as sd (sd.key)}
								<input
									type="number"
									step="any"
									placeholder={sd.label}
									value={stats[p.competitorId!]?.[sd.key] ?? ''}
									oninput={(e) => setStat(p.competitorId!, sd.key, e.currentTarget.value)}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="save">
		<Button type="submit" size="lg" disabled={!complete}>Save result →</Button>
	</div>
</form>

<style>
	.result {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.rlabel {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 700;
	}
	.hint {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}
	.tap {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex: 1;
		min-width: 12rem;
		padding: 0.55rem 0.8rem;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.row.ranked .tap {
		border-color: #ff6a2b99;
		background: var(--accent-soft);
	}
	.pos {
		width: 1.6rem;
		text-align: center;
		font-weight: 700;
		font-size: 1rem;
	}
	.pname {
		font-weight: 500;
	}
	.who {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 9rem;
	}
	.stats {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.stats input,
	.score {
		width: 6.5rem;
	}
	.link {
		align-self: flex-start;
		background: none;
		border: none;
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.teams {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.7rem;
	}
	.teamcard {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.9rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.teamcard.won {
		border-color: #ff6a2b99;
		background: var(--accent-soft);
	}
	.solo {
		display: flex;
		align-items: stretch;
		gap: 0.7rem;
		flex-wrap: wrap;
	}
	.sidecard {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-width: 12rem;
		padding: 0.9rem;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.sidecard.won {
		border-color: #ff6a2b99;
		background: var(--accent-soft);
	}
	.vs {
		align-self: center;
		font-family: var(--font-display);
		font-weight: 700;
		color: var(--text-faint);
	}
	.tm.big {
		font-size: 1.05rem;
		font-weight: 600;
	}
	.tlabel {
		font-weight: 700;
		font-family: var(--font-display);
	}
	.tmembers {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.tm {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.9rem;
	}
	.save {
		margin-top: 0.3rem;
	}
</style>
