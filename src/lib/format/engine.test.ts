import { describe, expect, it } from 'vitest';
import { eligibleFormats, planFormat, selectFormat } from './engine';
import type { FormatContext, FormatPlan, MatchSlot } from './types';

function ctx(over: Partial<FormatContext> & { n: number }): FormatContext {
	const { n, ...rest } = over;
	return {
		competitorIds: Array.from({ length: n }, (_, i) => i + 1),
		maxPlayers: 4,
		mode: 'ffa',
		scoringType: 'placement',
		roundMinutes: 5,
		teamSize: 2,
		timeBudgetMinutes: 30,
		...rest
	};
}

const competitorSlots = (plan: FormatPlan) =>
	plan.matches.flatMap((m) => m.slots).filter((s): s is Extract<MatchSlot, { kind: 'competitor' }> => s.kind === 'competitor');

function appearances(plan: FormatPlan): Map<number, number> {
	const m = new Map<number, number>();
	for (const s of competitorSlots(plan)) m.set(s.competitorId, (m.get(s.competitorId) ?? 0) + 1);
	return m;
}

describe('selectFormat', () => {
	it('everyone fits an FFA game → single match', () => {
		expect(selectFormat(ctx({ n: 4, mode: 'ffa', maxPlayers: 4 }))).toBe('single_match');
	});
	it('FFA overflow → heats + final', () => {
		expect(selectFormat(ctx({ n: 6, mode: 'ffa', maxPlayers: 4 }))).toBe('heats_final');
	});
	it('1v1 small field within budget → round robin', () => {
		// 4 players, 6 matches * 5m = 30m ≤ budget
		expect(selectFormat(ctx({ n: 4, mode: '1v1', maxPlayers: 2, roundMinutes: 5, timeBudgetMinutes: 30 }))).toBe('round_robin');
	});
	it('1v1 large field over budget → single elimination', () => {
		// 6 players, 15 matches * 5m = 75m > 30m budget
		expect(selectFormat(ctx({ n: 6, mode: '1v1', maxPlayers: 2, roundMinutes: 5, timeBudgetMinutes: 30 }))).toBe('single_elimination');
	});
	it('a 2-seat FFA game is treated as pairwise', () => {
		expect(selectFormat(ctx({ n: 4, mode: 'ffa', maxPlayers: 2, roundMinutes: 3, timeBudgetMinutes: 30 }))).toBe('round_robin');
	});
	it('teams mode → team match', () => {
		expect(selectFormat(ctx({ n: 4, mode: 'teams', maxPlayers: 4 }))).toBe('team_match');
	});
	it('co-op → coop score', () => {
		expect(selectFormat(ctx({ n: 4, mode: 'coop_score', maxPlayers: 4 }))).toBe('coop_score');
	});
	it('one-vs-all → one vs all (only option)', () => {
		expect(selectFormat(ctx({ n: 4, mode: 'one_vs_all', maxPlayers: 4 }))).toBe('one_vs_all');
		expect(eligibleFormats(ctx({ n: 4, mode: 'one_vs_all', maxPlayers: 4 }))).toEqual(['one_vs_all']);
	});
	it('offers RR and elimination as alternatives for pairwise', () => {
		expect(eligibleFormats(ctx({ n: 6, mode: '1v1', maxPlayers: 2 }))).toEqual([
			'round_robin',
			'single_elimination'
		]);
	});
});

describe('single_match', () => {
	it('one match with everyone', () => {
		const plan = planFormat(ctx({ n: 4, mode: 'ffa', maxPlayers: 4 }));
		expect(plan.matches).toHaveLength(1);
		expect(plan.matches[0].slots).toHaveLength(4);
		expect([...appearances(plan).values()]).toEqual([1, 1, 1, 1]);
	});
});

describe('round_robin', () => {
	it('N=4 → 6 matches, everyone plays everyone once', () => {
		const plan = planFormat({ ...ctx({ n: 4 }), formatOverride: 'round_robin' });
		expect(plan.matches).toHaveLength(6);
		// each competitor plays N-1 = 3 matches
		for (const count of appearances(plan).values()) expect(count).toBe(3);
		// all pairings unique
		const pairs = plan.matches.map((m) =>
			m.slots
				.map((s) => (s.kind === 'competitor' ? s.competitorId : -1))
				.sort((a, b) => a - b)
				.join('-')
		);
		expect(new Set(pairs).size).toBe(6);
	});
	it('N=5 → 10 matches (odd handled via byes)', () => {
		const plan = planFormat({ ...ctx({ n: 5 }), formatOverride: 'round_robin' });
		expect(plan.matches).toHaveLength(10);
		for (const count of appearances(plan).values()) expect(count).toBe(4);
	});
});

describe('single_elimination', () => {
	it('N=4 → 4 matches incl. a third-place, with a Final', () => {
		const plan = planFormat({ ...ctx({ n: 4 }), formatOverride: 'single_elimination' });
		expect(plan.matches).toHaveLength(4);
		expect(plan.matches.some((m) => m.label === 'Final' && m.kind === 'final')).toBe(true);
		expect(plan.matches.some((m) => m.label === 'Third place')).toBe(true);
	});
	it('N=8 → 8 matches (7 bracket + third place)', () => {
		const plan = planFormat({ ...ctx({ n: 8 }), formatOverride: 'single_elimination' });
		expect(plan.matches).toHaveLength(8);
	});
	it('N=5 → 5 matches, nobody plays twice in round 0', () => {
		const plan = planFormat({ ...ctx({ n: 5 }), formatOverride: 'single_elimination' });
		expect(plan.matches).toHaveLength(5);
		const round0 = plan.matches.filter((m) => m.round === 0);
		const ids = round0.flatMap((m) => m.slots.filter((s) => s.kind === 'competitor').map((s) => (s as { competitorId: number }).competitorId));
		expect(new Set(ids).size).toBe(ids.length);
	});
	it('N=3 → 2 matches, no separate third-place', () => {
		const plan = planFormat({ ...ctx({ n: 3 }), formatOverride: 'single_elimination' });
		expect(plan.matches).toHaveLength(2);
		expect(plan.matches.some((m) => m.label === 'Third place')).toBe(false);
	});
});

describe('heats_final', () => {
	it('N=6, M=4 → 2 heats + grand final, all covered', () => {
		const plan = planFormat(ctx({ n: 6, mode: 'ffa', maxPlayers: 4 }));
		expect(plan.formatType).toBe('heats_final');
		const heats = plan.matches.filter((m) => m.kind === 'heat');
		const finals = plan.matches.filter((m) => m.kind === 'final');
		expect(heats).toHaveLength(2);
		expect(finals).toHaveLength(1);
		// every competitor appears in exactly one heat
		expect(appearances(plan).size).toBe(6);
		for (const c of appearances(plan).values()) expect(c).toBe(1);
		// grand final has min(M,N) = 4 seats
		expect(finals[0].slots).toHaveLength(4);
		expect(finals[0].slots.every((s) => s.kind === 'heatPlace')).toBe(true);
	});
	it('N=9, M=4 → 3 heats + final', () => {
		const plan = planFormat(ctx({ n: 9, mode: 'ffa', maxPlayers: 4 }));
		expect(plan.matches.filter((m) => m.kind === 'heat')).toHaveLength(3);
	});
});

describe('team_match', () => {
	it('N=4, size 2, fits → one match with two teams', () => {
		const plan = planFormat(ctx({ n: 4, mode: 'teams', teamSize: 2, maxPlayers: 4 }));
		expect(plan.matches).toHaveLength(1);
		const teams = plan.matches[0].slots.map((s) => (s.kind === 'competitor' ? s.team : undefined));
		expect(teams.filter((t) => t === 0)).toHaveLength(2);
		expect(teams.filter((t) => t === 1)).toHaveLength(2);
	});
	it('N=6, size 2 → 3 teams, round-robin of 3 matches', () => {
		const plan = planFormat(ctx({ n: 6, mode: 'teams', teamSize: 2, maxPlayers: 4 }));
		expect(plan.matches).toHaveLength(3);
	});
});

describe('coop_score', () => {
	it('N=6, M=4 → 2 score runs', () => {
		const plan = planFormat(ctx({ n: 6, mode: 'coop_score', maxPlayers: 4 }));
		expect(plan.matches).toHaveLength(2);
		expect(plan.matches.every((m) => m.kind === 'score')).toBe(true);
	});
	it('N=3, M=4 → 1 score run', () => {
		const plan = planFormat(ctx({ n: 3, mode: 'coop_score', maxPlayers: 4 }));
		expect(plan.matches).toHaveLength(1);
	});
});

describe('one_vs_all', () => {
	it('N=4 → 4 solo rounds; each player is the lone one exactly once, everyone plays every round', () => {
		const plan = planFormat(ctx({ n: 4, mode: 'one_vs_all', maxPlayers: 4 }));
		expect(plan.formatType).toBe('one_vs_all');
		expect(plan.matches).toHaveLength(4);
		// everyone appears in every round
		for (const count of appearances(plan).values()) expect(count).toBe(4);
		// each round: exactly one solo (team 0) vs the rest (team 1)
		const solos: number[] = [];
		for (const m of plan.matches) {
			expect(m.kind).toBe('solo');
			const teams = m.slots.map((s) => (s.kind === 'competitor' ? s.team : undefined));
			expect(teams.filter((t) => t === 0)).toHaveLength(1);
			expect(teams.filter((t) => t === 1)).toHaveLength(3);
			const solo = m.slots.find((s) => s.kind === 'competitor' && s.team === 0);
			if (solo && solo.kind === 'competitor') solos.push(solo.competitorId);
		}
		// every competitor is the solo exactly once
		expect(new Set(solos).size).toBe(4);
	});
});

describe('estimates', () => {
	it('are positive and scale with matches', () => {
		const rr = planFormat({ ...ctx({ n: 4, roundMinutes: 5 }), formatOverride: 'round_robin' });
		const single = planFormat(ctx({ n: 4, maxPlayers: 4, roundMinutes: 5 }));
		expect(single.estimateMinutes).toBeGreaterThan(0);
		expect(rr.estimateMinutes).toBeGreaterThan(single.estimateMinutes);
	});
});
