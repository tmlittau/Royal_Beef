<script lang="ts">
	import { page } from '$app/stores';
	import Button from './Button.svelte';

	const links = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/library', label: 'Library' },
		{ href: '/controllers', label: 'Controllers' }
	];

	let path = $derived($page.url.pathname);
</script>

<header class="nav">
	<div class="container inner">
		<a class="brand" href="/">
			<span class="mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
					<path
						d="M4 8l3.2 2.4L12 5l4.8 5.4L20 8l-1.4 9H5.4L4 8z"
						fill="#1a0a02"
					/>
					<circle cx="4" cy="8" r="1.6" fill="#1a0a02" />
					<circle cx="20" cy="8" r="1.6" fill="#1a0a02" />
					<circle cx="12" cy="4.4" r="1.7" fill="#1a0a02" />
				</svg>
			</span>
			<span class="wordmark">
				<strong>Royal Beef</strong>
				<small>Couch Competition</small>
			</span>
		</a>

		<nav class="links">
			{#each links as link}
				<a
					href={link.href}
					class="link"
					class:active={link.href === '/' ? path === '/' : path.startsWith(link.href)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="cta">
			<Button href="/competition/new" size="md">New competition →</Button>
		</div>
	</div>
</header>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		height: var(--nav-h);
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--border);
		background: #09090bcc;
		backdrop-filter: blur(12px);
	}
	.inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
	}
	.mark {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: var(--r-sm);
		background: var(--accent-grad);
		box-shadow: var(--shadow-glow);
	}
	.wordmark {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.wordmark strong {
		font-family: var(--font-display);
		font-size: 1.05rem;
		letter-spacing: -0.01em;
	}
	.wordmark small {
		font-size: 0.72rem;
		color: var(--text-faint);
	}
	.links {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-left: auto;
	}
	.link {
		padding: 0.5rem 0.85rem;
		border-radius: var(--r-pill);
		font-weight: 500;
		color: var(--text-muted);
		transition: color 0.2s var(--ease), background 0.2s var(--ease);
	}
	.link:hover {
		color: var(--text);
		background: var(--surface);
	}
	.link.active {
		color: var(--text);
		background: var(--surface);
	}
	.cta {
		display: flex;
	}

	@media (max-width: 640px) {
		.wordmark small,
		.cta {
			display: none;
		}
	}
</style>
