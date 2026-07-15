<script lang="ts">
	import type { SteamAppDetails, SteamSearchItem } from '$lib/steam';

	let { onimport }: { onimport: (d: SteamAppDetails) => void } = $props();

	let query = $state('');
	let results = $state<SteamSearchItem[]>([]);
	let loading = $state(false);
	let importingId = $state<number | null>(null);
	let error = $state('');
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onInput() {
		error = '';
		clearTimeout(timer);
		const q = query.trim();
		if (q.length < 2) {
			results = [];
			open = false;
			return;
		}
		timer = setTimeout(() => runSearch(q), 300);
	}

	async function runSearch(q: string) {
		loading = true;
		open = true;
		try {
			const res = await fetch(`/api/steam/search?q=${encodeURIComponent(q)}`);
			const data = await res.json();
			if (data.error) {
				error = data.error;
				results = [];
			} else {
				results = data.items ?? [];
			}
		} catch {
			error = 'Could not reach Steam.';
			results = [];
		} finally {
			loading = false;
		}
	}

	async function pick(item: SteamSearchItem) {
		importingId = item.appId;
		error = '';
		try {
			const res = await fetch(`/api/steam/app/${item.appId}`);
			const data = await res.json();
			if (!res.ok || data.error) {
				error = data.error ?? 'Import failed';
				return;
			}
			onimport(data as SteamAppDetails);
			open = false;
			query = '';
			results = [];
		} catch {
			error = 'Could not reach Steam.';
		} finally {
			importingId = null;
		}
	}
</script>

<div class="steam">
	<div class="row head">
		<span class="badge">◆ Steam</span>
		<span class="label">Import from Steam to prefill name, cover &amp; description</span>
	</div>

	<div class="search">
		<input
			type="search"
			placeholder="Search Steam… (e.g. Overcooked)"
			bind:value={query}
			oninput={onInput}
			onfocus={() => {
				if (results.length) open = true;
			}}
			autocomplete="off"
		/>
		{#if loading}<span class="spinner" aria-label="Searching"></span>{/if}
	</div>

	{#if error}
		<p class="err">{error}</p>
	{/if}

	{#if open && results.length}
		<ul class="results">
			{#each results as item (item.appId)}
				<li>
					<button type="button" onclick={() => pick(item)} disabled={importingId !== null}>
						{#if item.thumb}
							<img src={item.thumb} alt="" loading="lazy" />
						{:else}
							<span class="noimg"></span>
						{/if}
						<span class="name">{item.name}</span>
						{#if importingId === item.appId}
							<span class="spinner sm"></span>
						{:else}
							<span class="add">Import</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else if open && !loading && !error}
		<p class="empty">No matches.</p>
	{/if}
</div>

<style>
	.steam {
		position: relative;
		padding: 1rem 1.1rem;
		border: 1px solid #35e0c133;
		border-radius: var(--r-md);
		background: var(--cool-soft);
	}
	.head {
		gap: 0.6rem;
		margin-bottom: 0.7rem;
	}
	.badge {
		padding: 0.2rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--cool);
		border: 1px solid #35e0c14d;
		border-radius: var(--r-pill);
	}
	.label {
		font-size: 0.82rem;
		color: var(--text-muted);
	}
	.search {
		position: relative;
	}
	.search input {
		padding-right: 2.4rem;
	}
	.spinner {
		position: absolute;
		right: 0.8rem;
		top: 50%;
		width: 1rem;
		height: 1rem;
		margin-top: -0.5rem;
		border: 2px solid #ffffff2e;
		border-top-color: var(--cool);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	.spinner.sm {
		position: static;
		margin: 0;
		width: 0.9rem;
		height: 0.9rem;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.results {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0.3rem;
		max-height: 320px;
		overflow-y: auto;
		background: var(--elev-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-sm);
		box-shadow: var(--shadow-lg);
	}
	.results button {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		padding: 0.45rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: var(--r-xs);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s var(--ease);
	}
	.results button:hover:not(:disabled) {
		background: var(--surface-hover);
	}
	.results button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.results img,
	.noimg {
		width: 92px;
		height: 35px;
		object-fit: cover;
		border-radius: 4px;
		background: var(--bg-2);
		flex-shrink: 0;
	}
	.results .name {
		flex: 1;
		font-size: 0.9rem;
		color: var(--text);
	}
	.add {
		font-size: 0.74rem;
		font-weight: 600;
		color: var(--cool);
	}
	.err {
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: #ff6a86;
	}
	.empty {
		margin-top: 0.5rem;
		font-size: 0.82rem;
		color: var(--text-faint);
	}
</style>
