import { describe, expect, it } from 'vitest';
import { applyDeciders, rankGame, rankGameWithTies, type MatchResult, type RankInput } from './ranking';

function input(over: Partial<RankInput>): RankInput {
	return {
		formatType: 'single_match',
		scoringType: 'placement',
		teamSize: 2,
		pointsScheme: [3, 2, 1],
		competitorIds: [1, 2, 3, 4],
		matches: [],
		...over
	};
}

const m = (over: Partial<MatchResult>): MatchResult => ({
	ref: 'm',
	kind: 'ffa',
	round: 0,
	entries: [],
	...over
});

describe('single_match', () => {
	it('placements map to 3·2·1', () => {
		const r = rankGame(
			input({
				matches: [
					m({
						entries: [
							{ competitorId: 1, placement: 3 },
							{ competitorId: 2, placement: 1 },
							{ competitorId: 3, placement: 2 },
							{ competitorId: 4, placement: 4 }
						]
					})
				]
			})
		);
		expect(r.map((x) => [x.competitorId, x.points])).toEqual([
			[2, 3],
			[3, 2],
			[1, 1],
			[4, 0]
		]);
	});
});

describe('one_vs_all', () => {
	// Each player is the lone one once; "rounds won" = solo wins + pack wins.
	const soloRounds: MatchResult[] = [
		// 1 is solo and beats the pack
		m({ ref: 's0', kind: 'solo', entries: [
			{ competitorId: 1, placement: 1, team: 0 },
			{ competitorId: 2, placement: 2, team: 1 },
			{ competitorId: 3, placement: 2, team: 1 },
			{ competitorId: 4, placement: 2, team: 1 }
		] }),
		// 2 is solo, the pack stops them
		m({ ref: 's1', kind: 'solo', entries: [
			{ competitorId: 2, placement: 2, team: 0 },
			{ competitorId: 1, placement: 1, team: 1 },
			{ competitorId: 3, placement: 1, team: 1 },
			{ competitorId: 4, placement: 1, team: 1 }
		] }),
		// 3 is solo, the pack stops them
		m({ ref: 's2', kind: 'solo', entries: [
			{ competitorId: 3, placement: 2, team: 0 },
			{ competitorId: 1, placement: 1, team: 1 },
			{ competitorId: 2, placement: 1, team: 1 },
			{ competitorId: 4, placement: 1, team: 1 }
		] }),
		// 4 is solo, the pack stops them
		m({ ref: 's3', kind: 'solo', entries: [
			{ competitorId: 4, placement: 2, team: 0 },
			{ competitorId: 1, placement: 1, team: 1 },
			{ competitorId: 2, placement: 1, team: 1 },
			{ competitorId: 3, placement: 1, team: 1 }
		] })
	];

	it('ranks by rounds won — winning solo + surviving every pack crowns player 1', () => {
		const r = rankGame(input({ formatType: 'one_vs_all', matches: soloRounds }));
		// 1 wins 4 rounds; 2/3/4 each win 2 pack rounds → tie broken by seed
		expect(r.map((x) => [x.competitorId, x.points])).toEqual([
			[1, 3],
			[2, 2],
			[3, 1],
			[4, 0]
		]);
	});

	it('the harder feat (winning your own solo round) breaks a rounds-won tie', () => {
		const r = rankGame(
			input({
				formatType: 'one_vs_all',
				matches: [
					// 2 wins as solo
					m({ ref: 'a', kind: 'solo', entries: [
						{ competitorId: 2, placement: 1, team: 0 },
						{ competitorId: 1, placement: 2, team: 1 },
						{ competitorId: 3, placement: 2, team: 1 },
						{ competitorId: 4, placement: 2, team: 1 }
					] }),
					// pack {1,3,4} each get a pack win → everyone ends on 1 round won
					m({ ref: 'b', kind: 'solo', entries: [
						{ competitorId: 2, placement: 2, team: 0 },
						{ competitorId: 1, placement: 1, team: 1 },
						{ competitorId: 3, placement: 1, team: 1 },
						{ competitorId: 4, placement: 1, team: 1 }
					] })
				]
			})
		);
		// all four have 1 round won, but 2 won it as the solo → 2 takes 1st
		expect(r[0].competitorId).toBe(2);
		expect(r.map((x) => x.points)).toEqual([3, 2, 1, 0]);
	});
});

describe('round_robin', () => {
	it('ranks by wins', () => {
		// 1 beats everyone, 2 beats 3 and 4, 3 beats 4
		const duels: MatchResult[] = [
			m({ ref: 'a', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] }),
			m({ ref: 'b', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'c', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'd', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'e', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'f', kind: 'duel', entries: [{ competitorId: 3, placement: 1 }, { competitorId: 4, placement: 2 }] })
		];
		const r = rankGame(input({ formatType: 'round_robin', matches: duels }));
		expect(r.map((x) => x.competitorId)).toEqual([1, 2, 3, 4]);
		expect(r.map((x) => x.points)).toEqual([3, 2, 1, 0]);
	});
	it('breaks a two-way tie by head-to-head', () => {
		// 1 and 2 both 1 win, but 2 beat 1 head-to-head
		const duels: MatchResult[] = [
			m({ ref: 'a', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 1, placement: 2 }] }),
			m({ ref: 'b', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'c', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] })
		];
		const r = rankGame(input({ formatType: 'round_robin', competitorIds: [1, 2, 3], pointsScheme: [3, 2, 1], matches: duels }));
		expect(r[0].competitorId).toBe(2); // 2 beat 1 head-to-head
	});
});

describe('single_elimination', () => {
	it('final + third place decide 1·2·3', () => {
		const matches: MatchResult[] = [
			m({ ref: 'se-r0-m0', kind: 'duel', round: 0, entries: [{ competitorId: 1, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'se-r0-m1', kind: 'duel', round: 0, entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'se-r1-m0', kind: 'final', round: 1, entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] }),
			m({ ref: 'se-3rd', kind: 'duel', round: 2, entries: [{ competitorId: 3, placement: 1 }, { competitorId: 4, placement: 2 }] })
		];
		const r = rankGame(input({ formatType: 'single_elimination', matches }));
		expect(r.map((x) => x.competitorId)).toEqual([1, 2, 3, 4]);
		expect(r.map((x) => x.points)).toEqual([3, 2, 1, 0]);
	});
	it('N=3: semifinal loser is 3rd (no third-place match)', () => {
		const matches: MatchResult[] = [
			m({ ref: 'se-r0-m0', kind: 'duel', round: 0, entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'se-r1-m0', kind: 'final', round: 1, entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] })
		];
		const r = rankGame(input({ formatType: 'single_elimination', competitorIds: [1, 2, 3], matches }));
		expect(r.map((x) => x.competitorId)).toEqual([1, 2, 3]);
	});
});

describe('heats_final', () => {
	it('final placements rank above non-finalists', () => {
		const matches: MatchResult[] = [
			m({ ref: 'heat-0', kind: 'heat', round: 0, entries: [{ competitorId: 1, placement: 1 }, { competitorId: 3, placement: 2 }, { competitorId: 5, placement: 3 }] }),
			m({ ref: 'heat-1', kind: 'heat', round: 0, entries: [{ competitorId: 2, placement: 1 }, { competitorId: 4, placement: 2 }, { competitorId: 6, placement: 3 }] }),
			m({ ref: 'grand-final', kind: 'final', round: 1, entries: [{ competitorId: 2, placement: 1 }, { competitorId: 1, placement: 2 }, { competitorId: 3, placement: 3 }, { competitorId: 4, placement: 4 }] })
		];
		const r = rankGame(input({ formatType: 'heats_final', competitorIds: [1, 2, 3, 4, 5, 6], matches }));
		// finalists in final order, then non-finalists 5,6 by heat placement (both 3rd → seed)
		expect(r.map((x) => x.competitorId)).toEqual([2, 1, 3, 4, 5, 6]);
		expect(r.slice(0, 3).map((x) => x.points)).toEqual([3, 2, 1]);
	});
});

describe('team_match', () => {
	it('only the winning team scores, split (min 1) by size', () => {
		// team 0 (players 1,2) beats team 1 (players 3,4). teamSize 2 → 3 each.
		const matches: MatchResult[] = [
			m({
				ref: 'team-1',
				kind: 'team',
				entries: [
					{ competitorId: 1, placement: 1, team: 0 },
					{ competitorId: 2, placement: 1, team: 0 },
					{ competitorId: 3, placement: 2, team: 1 },
					{ competitorId: 4, placement: 2, team: 1 }
				]
			})
		];
		const r = rankGame(input({ formatType: 'team_match', teamSize: 2, matches }));
		const pts = new Map(r.map((x) => [x.competitorId, x.points]));
		expect(pts.get(1)).toBe(3);
		expect(pts.get(2)).toBe(3);
		expect(pts.get(3)).toBe(0);
		expect(pts.get(4)).toBe(0);
	});
	it('team of 3 → 2 points each; team of 4 → 1 each (floor, min 1)', () => {
		const three: MatchResult[] = [
			m({ ref: 't', kind: 'team', entries: [
				{ competitorId: 1, placement: 1, team: 0 },
				{ competitorId: 2, placement: 1, team: 0 },
				{ competitorId: 3, placement: 1, team: 0 },
				{ competitorId: 4, placement: 2, team: 1 },
				{ competitorId: 5, placement: 2, team: 1 },
				{ competitorId: 6, placement: 2, team: 1 }
			] })
		];
		const r = rankGame(input({ formatType: 'team_match', teamSize: 3, competitorIds: [1, 2, 3, 4, 5, 6], matches: three }));
		expect(new Map(r.map((x) => [x.competitorId, x.points])).get(1)).toBe(2);
	});
});

describe('tie detection (rankGameWithTies)', () => {
	it('flags a round-robin 3-way cycle for the podium', () => {
		// A>B>C>A: everyone 1 win → genuine 3-way tie for positions 1–3
		const duels: MatchResult[] = [
			m({ ref: 'a', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] }),
			m({ ref: 'b', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'c', kind: 'duel', entries: [{ competitorId: 3, placement: 1 }, { competitorId: 1, placement: 2 }] })
		];
		const { ties } = rankGameWithTies(input({ formatType: 'round_robin', competitorIds: [1, 2, 3], matches: duels }));
		expect(ties).toHaveLength(1);
		expect(new Set(ties[0].competitorIds)).toEqual(new Set([1, 2, 3]));
		expect(ties[0].minPosition).toBe(1);
	});
	it('flags a cyclic equal-wins tie for the lower podium spots', () => {
		// 1 beats everyone (3 wins); 2,3,4 form a cycle (each 1 win) → tie for 2nd–4th
		const duels: MatchResult[] = [
			m({ ref: 'a', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] }),
			m({ ref: 'b', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'c', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'd', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'e', kind: 'duel', entries: [{ competitorId: 3, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'f', kind: 'duel', entries: [{ competitorId: 4, placement: 1 }, { competitorId: 2, placement: 2 }] })
		];
		const { results, ties } = rankGameWithTies(input({ formatType: 'round_robin', matches: duels }));
		expect(results[0].competitorId).toBe(1); // 1 wins outright
		const tie = ties.find((t) => t.competitorIds.length === 3);
		expect(tie).toBeTruthy();
		expect(tie!.minPosition).toBe(2);
	});
	it('does not flag a tie that only affects non-scoring positions', () => {
		// 1>2>3 clear; 4 and 5 tie for 4th/5th (no points) → not flagged
		const duels: MatchResult[] = [
			m({ ref: 'a', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }] }),
			m({ ref: 'b', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'c', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 3, placement: 2 }] }),
			m({ ref: 'd', kind: 'duel', entries: [{ competitorId: 1, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'e', kind: 'duel', entries: [{ competitorId: 2, placement: 1 }, { competitorId: 4, placement: 2 }] }),
			m({ ref: 'f', kind: 'duel', entries: [{ competitorId: 3, placement: 1 }, { competitorId: 4, placement: 2 }] })
		];
		// 1→3 wins, 2→2, 3→1, 4→0. No ties at all here, so also assert single_match never ties:
		const { ties } = rankGameWithTies(input({ formatType: 'single_match', matches: [m({ entries: [
			{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }, { competitorId: 3, placement: 3 }, { competitorId: 4, placement: 4 }
		] })] }));
		expect(ties).toHaveLength(0);
		void duels;
	});
});

describe('applyDeciders', () => {
	it('re-orders a tied group by the decider result', () => {
		// base order 1,2,3,4 but 2 & 3 were tied; decider says 3 beat 2
		const base = rankGame(input({ matches: [m({ entries: [
			{ competitorId: 1, placement: 1 }, { competitorId: 2, placement: 2 }, { competitorId: 3, placement: 3 }, { competitorId: 4, placement: 4 }
		] })] }));
		const out = applyDeciders(base, [[3, 2]], [3, 2, 1]);
		expect(out.map((x) => x.competitorId)).toEqual([1, 3, 2, 4]);
		expect(out.map((x) => x.points)).toEqual([3, 2, 1, 0]);
	});
});

describe('coop_score', () => {
	it('ranks by score, higher is better', () => {
		const matches: MatchResult[] = [
			m({ ref: 'run-0', kind: 'score', entries: [{ competitorId: 1, placement: 1, score: 800 }, { competitorId: 2, placement: 1, score: 1200 }] }),
			m({ ref: 'run-1', kind: 'score', entries: [{ competitorId: 3, placement: 1, score: 1000 }, { competitorId: 4, placement: 1, score: 500 }] })
		];
		const r = rankGame(input({ formatType: 'coop_score', scoringType: 'score', matches }));
		expect(r.map((x) => x.competitorId)).toEqual([2, 3, 1, 4]);
		expect(r.map((x) => x.points)).toEqual([3, 2, 1, 0]);
	});
});
