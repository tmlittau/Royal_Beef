<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Avatar from './Avatar.svelte';

	type P = { name: string; color: string };
	let {
		target,
		pool = [],
		label = '',
		onrevealed
	}: { target: P; pool?: P[]; label?: string; onrevealed?: () => void } = $props();

	let display = $state<P>(untrack(() => pool[0] ?? target));
	let revealed = $state(false);

	onMount(() => {
		if (pool.length <= 1) {
			display = target;
			revealed = true;
			onrevealed?.();
			return;
		}
		let ticks = 0;
		const maxTicks = 20;
		let timer: ReturnType<typeof setTimeout>;
		const step = () => {
			ticks++;
			// keep the shuffle visibly changing
			let next = pool[Math.floor(Math.random() * pool.length)];
			if (next.name === display.name && pool.length > 1) {
				next = pool[(pool.indexOf(next) + 1) % pool.length];
			}
			display = next;
			if (ticks < maxTicks) {
				const interval = 60 + Math.max(0, ticks - 11) * 45; // ease-out
				timer = setTimeout(step, interval);
			} else {
				display = target;
				revealed = true;
				onrevealed?.();
			}
		};
		timer = setTimeout(step, 60);
		return () => clearTimeout(timer);
	});
</script>

<div class="reveal" class:revealed>
	<span class="eyebrow">{revealed ? "It's your turn" : 'Who’s next…'}</span>
	<div class="stage" class:spin={!revealed}>
		<Avatar name={display.name} color={display.color} size={96} />
	</div>
	<span class="rname" class:show={revealed}>{display.name}</span>
	<span class="label muted" class:show={revealed}>{label}</span>
</div>

<style>
	.reveal {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		text-align: center;
		padding: 1.5rem 0;
	}
	.stage {
		display: grid;
		place-items: center;
		transition: transform 0.35s var(--ease-out);
	}
	.stage.spin {
		animation: bob 0.5s ease-in-out infinite;
	}
	.reveal.revealed .stage {
		transform: scale(1.12);
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(-3deg);
		}
		50% {
			transform: translateY(-6px) rotate(3deg);
		}
	}
	.rname {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		letter-spacing: -0.02em;
		opacity: 0.65;
		transition: all 0.35s var(--ease-out);
	}
	.rname.show {
		opacity: 1;
		background: var(--accent-grad);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.label {
		font-size: 0.95rem;
		opacity: 0;
		transform: translateY(6px);
		transition: all 0.35s var(--ease-out) 0.1s;
	}
	.label.show {
		opacity: 1;
		transform: none;
	}
</style>
