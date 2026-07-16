<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let chosen = $state(0);
</script>

<svelte:head>
	<title>Controllers — Royal Beef</title>
</svelte:head>

<div class="head stack">
	<span class="eyebrow">⚔️ Weapon rack</span>
	<h1>Controllers</h1>
	<p class="muted">
		Your controller inventory. Players draft from these at the start of a competition — upload an
		image for each controller you own. Set a quantity above 1 if you have duplicates.
	</p>
</div>

<!-- Feedback -->
{#if form?.error}
	<p class="msg error">{form.error}</p>
{:else if form?.added}
	<p class="msg ok">
		Added {form.added} controller{form.added === 1 ? '' : 's'}.{form.warning ? ` ${form.warning}` : ''}
	</p>
{:else if form?.deleted}
	<p class="msg ok">Controller removed.</p>
{/if}

<!-- Upload -->
<form
	class="upload"
	method="POST"
	action="?/upload"
	enctype="multipart/form-data"
	onsubmit={() => (chosen = 0)}
>
	<input
		bind:this={fileInput}
		type="file"
		name="images"
		accept="image/png,image/jpeg,image/webp,image/svg+xml"
		multiple
		hidden
		onchange={(e) => (chosen = e.currentTarget.files?.length ?? 0)}
	/>
	<button type="button" class="drop" onclick={() => fileInput?.click()}>
		<span class="drop-icon">＋</span>
		<span class="drop-main">Choose controller image{chosen > 1 ? 's' : ''}</span>
		<span class="drop-sub">
			{#if chosen}
				{chosen} file{chosen === 1 ? '' : 's'} ready — PNG, JPG, WebP or SVG (max 8 MB each)
			{:else}
				PNG, JPG, WebP or SVG · transparent background looks best
			{/if}
		</span>
	</button>
	<div class="upload-actions">
		<Button type="submit" disabled={chosen === 0}>Upload →</Button>
	</div>
</form>

<!-- Inventory -->
{#if data.controllers.length === 0}
	<div class="empty">
		<p>No controllers yet — upload your first image above.</p>
	</div>
{:else}
	<div class="grid">
		{#each data.controllers as c (c.id)}
			<div class="card">
				<span class="img">
					<img src="/controllers/{c.image}" alt={c.label} loading="lazy" />
				</span>

				<form method="POST" action="?/update" class="edit">
					<input type="text" name="label" value={c.label} maxlength="60" aria-label="Label" />
					<div class="qty">
						<label>
							<span class="qlabel">Owned</span>
							<input type="number" name="quantity" value={c.quantity} min="1" max="99" />
						</label>
						<input type="hidden" name="id" value={c.id} />
						<button type="submit" class="save">Save</button>
					</div>
				</form>

				<div class="foot">
					{#if c.usedCount > 0}
						<span class="used" title="Assigned in a competition">● in use</span>
					{:else}
						<span class="filename">{c.image}</span>
					{/if}
					<form method="POST" action="?/delete">
						<input type="hidden" name="id" value={c.id} />
						<button type="submit" class="del" disabled={c.usedCount > 0}>Remove</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{/if}

<div class="back">
	<Button href="/" variant="ghost">← Dashboard</Button>
</div>

<style>
	.head {
		gap: 0.5rem;
		margin-bottom: 1.4rem;
		max-width: 60ch;
	}
	h1 {
		font-size: clamp(2rem, 4.5vw, 3rem);
	}
	.msg {
		margin-bottom: 1rem;
		padding: 0.7rem 1rem;
		border-radius: var(--r-sm);
		font-size: 0.9rem;
	}
	.msg.ok {
		background: var(--cool-soft);
		border: 1px solid #35e0c155;
		color: var(--cool);
	}
	.msg.error {
		background: #ff2d5518;
		border: 1px solid #ff2d5555;
		color: #ff7089;
	}

	.upload {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		margin-bottom: 2rem;
	}
	.drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1.6rem 1rem;
		border: 1.5px dashed var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		cursor: pointer;
		transition: all 0.15s var(--ease);
	}
	.drop:hover {
		border-color: #ff6a2b99;
		background: var(--surface-hover);
	}
	.drop-icon {
		font-size: 1.6rem;
		line-height: 1;
		color: var(--accent);
	}
	.drop-main {
		font-weight: 600;
	}
	.drop-sub {
		font-size: 0.8rem;
		color: var(--text-faint);
	}
	.upload-actions {
		display: flex;
		justify-content: flex-end;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.img {
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
	.edit {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.edit input[type='text'] {
		width: 100%;
		padding: 0.45rem 0.6rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-xs);
	}
	.qty {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}
	.qty label {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
	}
	.qlabel {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-faint);
	}
	.qty input[type='number'] {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-size: 0.9rem;
		color: var(--text);
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-xs);
	}
	.save {
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
		background: var(--surface-hover);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-pill);
		cursor: pointer;
		transition: border-color 0.15s var(--ease);
	}
	.save:hover {
		border-color: #ff6a2b99;
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-top: 0.2rem;
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
	}
	.filename {
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.used {
		color: var(--cool);
		font-weight: 600;
	}
	.del {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.del:hover:not(:disabled) {
		color: #ff7089;
	}
	.del:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		text-decoration: none;
	}
	.empty {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	.back {
		margin-top: 2rem;
	}
</style>
