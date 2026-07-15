<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
			Enter your crew, pick from the library, and Royal Beef builds a time-feasible
			tournament for every game — tracking points, stats, and crowning one champion at the
			end of the night.
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
				<Badge tone="accent">Phase 4 · format engine</Badge>
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
				<a class="comp" href="/competition/{c.id}">
					<div class="comp-top">
						<strong>{c.name}</strong>
						{#if c.status === 'finished'}
							<Badge tone="cool">Finished</Badge>
						{:else}
							<Badge tone="accent">In progress</Badge>
						{/if}
					</div>
					<span class="comp-meta">
						{c.competitorCount} players · {c.gameCount} games · {fmtDate(c.createdAt)}
					</span>
				</a>
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
	.comp:hover {
		transform: translateY(-2px);
		border-color: var(--border-strong);
	}
	.comp-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}
	.comp-top strong {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.comp-meta {
		font-size: 0.8rem;
		color: var(--text-faint);
	}

	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
		}
	}
</style>
