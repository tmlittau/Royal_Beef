<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		let W = (canvas.width = window.innerWidth);
		let H = (canvas.height = window.innerHeight);
		const colors = ['#ff6a2b', '#ffb020', '#ff2d55', '#35e0c1', '#6a8bff', '#b06aff'];

		const parts = Array.from({ length: 150 }, () => ({
			x: Math.random() * W,
			y: -20 - Math.random() * H * 0.6,
			vx: (Math.random() - 0.5) * 2.5,
			vy: 2 + Math.random() * 4,
			size: 5 + Math.random() * 7,
			rot: Math.random() * Math.PI,
			vr: (Math.random() - 0.5) * 0.3,
			color: colors[Math.floor(Math.random() * colors.length)]
		}));

		let raf = 0;
		const start = performance.now();
		const tick = (t: number) => {
			ctx.clearRect(0, 0, W, H);
			for (const p of parts) {
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.03;
				p.rot += p.vr;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
				ctx.restore();
			}
			if (t - start < 4500) raf = requestAnimationFrame(tick);
			else ctx.clearRect(0, 0, W, H);
		};
		raf = requestAnimationFrame(tick);

		const onResize = () => {
			W = canvas.width = window.innerWidth;
			H = canvas.height = window.innerHeight;
		};
		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<canvas bind:this={canvas} class="confetti" aria-hidden="true"></canvas>

<style>
	.confetti {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 60;
	}
	@media print {
		.confetti {
			display: none;
		}
	}
</style>
