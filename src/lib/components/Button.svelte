<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = {
		variant?: 'primary' | 'ghost' | 'danger';
		size?: 'md' | 'lg';
		href?: string;
		children: Snippet;
	} & HTMLButtonAttributes &
		HTMLAnchorAttributes;

	let {
		variant = 'primary',
		size = 'md',
		href = undefined,
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a {href} class="btn {variant} {size}" {...rest}>{@render children()}</a>
{:else}
	<button class="btn {variant} {size}" {...rest}>{@render children()}</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55em;
		border: 1px solid transparent;
		border-radius: var(--r-pill);
		padding: 0.62em 1.15em;
		font-family: var(--font-body);
		font-weight: 600;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
		white-space: nowrap;
		transition:
			transform 0.18s var(--ease),
			box-shadow 0.25s var(--ease),
			background-color 0.2s var(--ease),
			border-color 0.2s var(--ease);
	}

	.btn.lg {
		padding: 0.85em 1.5em;
		font-size: 1.02rem;
	}

	.btn:active {
		transform: translateY(1px) scale(0.99);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.primary {
		background: var(--accent-grad);
		color: #1a0a02;
		box-shadow: var(--shadow-glow);
	}
	.primary:hover {
		transform: translateY(-1px);
		box-shadow:
			var(--shadow-glow),
			0 0 0 1px #ffffff1a inset;
	}

	.ghost {
		background: var(--surface);
		border-color: var(--border-strong);
		color: var(--text);
	}
	.ghost:hover {
		background: var(--surface-hover);
		border-color: #ffffff36;
	}

	.danger {
		background: transparent;
		border-color: #ff2d5566;
		color: #ff6a86;
	}
	.danger:hover {
		background: #ff2d5514;
	}
</style>
