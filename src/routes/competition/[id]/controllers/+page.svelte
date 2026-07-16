<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import Reveal from '$lib/components/Reveal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let revealed = $state(false);

	const sel = $derived(data.selection);
	const pool = $derived((sel?.competitors ?? []).map((c) => ({ name: c.name, color: c.color })));
	const target = $derived(
		sel?.currentCompetitorId != null
			? { name: sel.currentName ?? '?', color: sel.currentColor ?? '#ff6a2b' }
			: { name: '?', color: '#ff6a2b' }
	);
</script>

<svelte:head>
	<title>Pick your weapon — Royal Beef</title>
</svelte:head>

<div class="stack head">
	<span class="eyebrow">⚔️ {data.competitionName} · pick your weapon</span>
	<div class="progress">
		{#each sel?.competitors ?? [] as c, i (c.id)}
			<span class="dot" class:on={i < (sel?.index ?? 0)} class:cur={i === (sel?.index ?? 0)}></span>
		{/each}
		<span class="pcount muted">{(sel?.index ?? 0) + 1} of {sel?.total ?? 0}</span>
	</div>
</div>

{#if sel}
	<div class="reveal-wrap">
		<Reveal {target} {pool} label="— choose your controller" onrevealed={() => (revealed = true)} />
	</div>

	{#if revealed}
		<div class="grid">
			{#each sel.controllers as ct (ct.id)}
				<form method="POST" action="?/pick" class="cell">
					<input type="hidden" name="controllerId" value={ct.id} />
					<button type="submit" class="ctrl" class:taken={ct.taken} disabled={ct.taken}>
						<span class="img">
							<img src="/controllers/{ct.image}" alt={ct.label} loading="lazy" />
							{#if ct.taken}<span class="tag">Taken</span>{/if}
						</span>
						<span class="clabel">{ct.label}</span>
					</button>
				</form>
			{/each}
		</div>

		<form method="POST" action="?/pick" class="skip">
			<button type="submit" class="skip-btn">Skip — play without a controller</button>
		</form>
	{/if}

	<!-- Roster so far -->
	<div class="roster">
		{#each sel.competitors as c (c.id)}
			<div class="rrow" class:done={c.picked}>
				<Avatar name={c.name} color={c.color} size={26} />
				<span class="rname">{c.name}</span>
				<span class="rpick">
					{#if c.controllerImage}
						<img src="/controllers/{c.controllerImage}" alt="" />{c.controllerLabel}
					{:else if c.picked}
						—
					{:else}
						<span class="faint">waiting</span>
					{/if}
				</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.head {
		gap: 0.7rem;
		margin-bottom: 1rem;
		align-items: center;
		text-align: center;
	}
	.progress {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--border-strong);
	}
	.dot.on {
		background: var(--cool);
	}
	.dot.cur {
		background: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}
	.pcount {
		font-size: 0.8rem;
		margin-left: 0.4rem;
	}
	.reveal-wrap {
		margin-bottom: 0.5rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.9rem;
		max-width: 760px;
		margin: 0 auto;
	}
	.cell {
		display: contents;
	}
	.ctrl {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		padding: 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.ctrl:hover:not(:disabled) {
		transform: translateY(-3px);
		border-color: #ff6a2b99;
		box-shadow: var(--shadow-glow);
	}
	.ctrl.taken {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.img {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 4 / 3;
		padding: 0.5rem;
		border-radius: var(--r-sm);
		background: radial-gradient(closest-side at 50% 45%, #ffffff42, #ffffff17 58%, transparent 82%);
	}
	.img img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		filter: drop-shadow(0 6px 12px #000a);
	}
	.tag {
		position: absolute;
		top: 0;
		right: 0;
		padding: 0.15rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-pill);
		color: var(--text-muted);
	}
	.clabel {
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
	}
	.skip {
		text-align: center;
		margin-top: 1.1rem;
	}
	.skip-btn {
		background: none;
		border: none;
		color: var(--text-faint);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.skip-btn:hover {
		color: var(--text-muted);
	}
	.roster {
		max-width: 460px;
		margin: 2rem auto 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.rrow {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.5rem;
		border-radius: var(--r-sm);
		opacity: 0.55;
	}
	.rrow.done {
		opacity: 1;
	}
	.rname {
		flex: 1;
	}
	.rpick {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.rpick img {
		height: 28px;
		width: 40px;
		object-fit: contain;
		padding: 2px 4px;
		border-radius: 6px;
		background: radial-gradient(closest-side at 50% 45%, #ffffff40, #ffffff12 70%, transparent);
	}
</style>
