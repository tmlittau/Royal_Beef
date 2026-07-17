<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let confirmId = $state<number | null>(null);

	function fmtDate(d: string | Date) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Royal Beef — Couch Competition</title>
</svelte:head>

<section class="hero">
	<div class="hero-copy stack">
		<span class="eyebrow">⚡ Couch gaming competition</span>
		<h1>
			Settle it on<br />
			the <span class="gradient-text">couch.</span>
		</h1>
		<p class="lede muted">
			Enter your crew, draft your controllers, then take turns picking games — Royal Beef
			builds a time-feasible tournament for each, tracking points and stats to crown one
			champion at the end of the night.
		</p>
		<div class="actions row">
			<Button href="/competition/new" size="lg">Start a competition →</Button>
			<Button href="/library" variant="ghost" size="lg">Browse the library</Button>
		</div>
	</div>

	<Card glow padding="1.6rem">
		<div class="status stack">
			<span class="eyebrow">System status</span>
			<div class="stat-row">
				<div class="stat">
					<span class="num gradient-text">{data.gameCount}</span>
					<span class="label muted">Games in library</span>
				</div>
				<div class="stat">
					<span class="num gradient-text">{data.competitions.length}</span>
					<span class="label muted">Competitions</span>
				</div>
				<div class="stat">
					<span class="num gradient-text">3·2·1</span>
					<span class="label muted">Points top three</span>
				</div>
			</div>
			<div class="chips row">
				<Badge tone="cool">◆ Database connected</Badge>
				<Badge tone="cool">🏆 Core complete</Badge>
				<Badge tone="accent">⚔️ Weapon draft</Badge>
			</div>
			<p class="faint hint">
				{#if data.gameCount === 0}
					Library is empty — the 17 starter games land in Phase 1.
				{:else}
					{data.gameCount} games ready to play.
				{/if}
			</p>
		</div>
	</Card>
</section>

{#if data.competitions.length}
	<section class="comps">
		<div class="comps-head">
			<h2>Your competitions</h2>
			<Button href="/competition/new" variant="ghost">+ New</Button>
		</div>
		<div class="comps-grid">
			{#each data.competitions as c (c.id)}
				<div class="comp-wrap">
					{#if confirmId === c.id}
						<div class="comp confirm">
							<strong class="comp-name">Delete “{c.name}”?</strong>
							<span class="faint">Permanently removes it and its results — the library is untouched.</span>
							<div class="crow">
								<form method="POST" action="?/deleteCompetition">
									<input type="hidden" name="id" value={c.id} />
									<button type="submit" class="cyes">Delete</button>
								</form>
								<button type="button" class="cno" onclick={() => (confirmId = null)}>Cancel</button>
							</div>
						</div>
					{:else}
						<a
							class="comp"
							href={c.status === 'finished'
								? `/competition/${c.id}/results`
								: `/competition/${c.id}`}
						>
							<strong class="comp-name">{c.name}</strong>
							<span class="comp-meta">
								{#if c.status === 'finished'}
									<Badge tone="cool">Finished</Badge>
								{:else}
									<Badge tone="accent">In progress</Badge>
								{/if}
								<span>{c.competitorCount} players · {c.gameCount} games · {fmtDate(c.createdAt)}</span>
							</span>
						</a>
						<button
							type="button"
							class="del-x"
							aria-label="Delete competition"
							title="Delete competition"
							onclick={() => (confirmId = c.id)}
						>
							✕
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.hero {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: clamp(1.5rem, 4vw, 3rem);
		align-items: center;
	}
	.hero-copy {
		gap: 1.25rem;
	}
	h1 {
		font-size: clamp(2.8rem, 6.5vw, 4.6rem);
	}
	.lede {
		max-width: 46ch;
		font-size: 1.08rem;
	}
	.actions {
		gap: 0.75rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.status {
		gap: 1.1rem;
	}
	.stat-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.num {
		font-family: var(--font-display);
		font-size: 1.9rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.label {
		font-size: 0.8rem;
	}
	.chips {
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.hint {
		font-size: 0.82rem;
	}

	.comps {
		margin-top: clamp(2.5rem, 6vw, 4rem);
	}
	.comps-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.1rem;
	}
	.comps-head h2 {
		font-size: 1.3rem;
	}
	.comps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1rem;
	}
	.comp-wrap {
		position: relative;
	}
	.comp {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
		transition:
			transform 0.2s var(--ease),
			border-color 0.2s var(--ease);
	}
	a.comp:hover {
		transform: translateY(-2px);
		border-color: var(--border-strong);
	}
	.comp-name {
		font-weight: 600;
		padding-right: 1.5rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.comp-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: var(--text-faint);
	}
	.del-x {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		width: 1.6rem;
		height: 1.6rem;
		display: grid;
		place-items: center;
		border: none;
		border-radius: 50%;
		background: var(--bg-2);
		color: var(--text-faint);
		font-size: 0.78rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0.45;
		transition:
			opacity 0.15s var(--ease),
			color 0.15s var(--ease),
			background 0.15s var(--ease);
	}
	.comp-wrap:hover .del-x {
		opacity: 0.8;
	}
	.del-x:hover,
	.del-x:focus-visible {
		opacity: 1;
		color: #ff7089;
		background: #ff2d5522;
	}
	.comp.confirm {
		gap: 0.35rem;
		border-color: #ff2d5544;
		background: #ff2d550a;
	}
	.crow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}
	.cyes {
		padding: 0.4rem 0.95rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: #ff7089;
		background: #ff2d5518;
		border: 1px solid #ff2d5555;
		border-radius: var(--r-pill);
		cursor: pointer;
	}
	.cyes:hover {
		background: #ff2d5528;
	}
	.cno {
		padding: 0.4rem 0.7rem;
		font-size: 0.82rem;
		color: var(--text-faint);
		background: none;
		border: none;
		cursor: pointer;
	}
	.cno:hover {
		color: var(--text-muted);
	}

	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
		}
	}
</style>
