<script lang="ts">
	import type { Game } from '$lib/server/db/schema';
	import { modeLabel, playerRange } from '$lib/games';

	let { game }: { game: Game } = $props();

	// A stable gradient hue for the placeholder, derived from the name.
	let hue = $derived(
		[...game.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
	);
	let initials = $derived(
		game.name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
	);
</script>

<a class="game-card" href="/library/{game.id}/edit">
	<div class="cover">
		{#if game.coverUrl}
			<img src={game.coverUrl} alt="" loading="lazy" />
		{:else}
			<div
				class="placeholder"
				style="background:
					radial-gradient(120% 120% at 20% 10%, hsl({hue} 70% 22%), transparent 60%),
					linear-gradient(140deg, hsl({hue} 45% 14%), #0c0c0f)"
			>
				<span>{initials}</span>
			</div>
		{/if}
		<span class="players">{playerRange(game.minPlayers, game.maxPlayers)}p</span>
	</div>

	<div class="body">
		<h3>{game.name}</h3>
		<div class="chips">
			<span class="chip">{modeLabel(game.defaultMode)}</span>
			<span class="chip">~{game.defaultRoundMinutes}m</span>
			{#if game.statDefinitions.length}
				<span class="chip cool">{game.statDefinitions.length} stat{game.statDefinitions.length > 1 ? 's' : ''}</span>
			{/if}
		</div>
	</div>
</a>

<style>
	.game-card {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		overflow: hidden;
		background: var(--surface);
		transition:
			transform 0.2s var(--ease),
			border-color 0.2s var(--ease),
			box-shadow 0.25s var(--ease);
	}
	.game-card:hover {
		transform: translateY(-3px);
		border-color: var(--border-strong);
		box-shadow: var(--shadow-md);
	}

	.cover {
		position: relative;
		aspect-ratio: 16 / 9;
		background: var(--bg-2);
	}
	.cover img,
	.placeholder {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.placeholder {
		display: grid;
		place-items: center;
	}
	.placeholder span {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 700;
		color: #ffffff1f;
		letter-spacing: 0.05em;
	}
	.players {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		padding: 0.15rem 0.5rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--text);
		background: #09090bcc;
		border: 1px solid var(--border);
		border-radius: var(--r-pill);
		backdrop-filter: blur(6px);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.85rem 0.95rem 1rem;
	}
	h3 {
		font-size: 1.02rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		padding: 0.2rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--text-muted);
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-pill);
	}
	.chip.cool {
		color: var(--cool);
		border-color: #35e0c14d;
		background: var(--cool-soft);
	}
</style>
