import type { FormatContext, FormatPlan, FormatType, MatchSlot, MatchSpec } from './types';

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const letter = (i: number) => String.fromCharCode(65 + i);
const comp = (competitorId: number, team?: number): MatchSlot => ({
	kind: 'competitor',
	competitorId,
	...(team === undefined ? {} : { team })
});

/** Split ids into `groups` balanced buckets (sizes differ by at most 1), mixing seeds. */
function distribute(ids: number[], groups: number): number[][] {
	const res: number[][] = Array.from({ length: groups }, () => []);
	ids.forEach((id, i) => res[i % groups].push(id));
	return res;
}

/** Circle-method round-robin: every pairing once, grouped into rounds where each plays at most once. */
function roundRobinSchedule(ids: number[]): { a: number; b: number; round: number }[] {
	const arr = [...ids];
	if (arr.length % 2 === 1) arr.push(-1); // phantom "bye" to make it even
	const n = arr.length;
	const half = n / 2;
	const out: { a: number; b: number; round: number }[] = [];
	let list = arr.slice();
	for (let r = 0; r < n - 1; r++) {
		for (let i = 0; i < half; i++) {
			const a = list[i];
			const b = list[n - 1 - i];
			if (a !== -1 && b !== -1) out.push({ a, b, round: r });
		}
		list = [list[0], list[n - 1], ...list.slice(1, n - 1)]; // rotate, first fixed
	}
	return out;
}

/** Standard tournament seeding order for a bracket of size P (power of two). */
function seedOrder(P: number): number[] {
	let pods = [1, 2];
	while (pods.length < P) {
		const sum = pods.length * 2 + 1;
		const next: number[] = [];
		for (const p of pods) next.push(p, sum - p);
		pods = next;
	}
	return pods;
}

function eliminationRoundLabel(round: number, totalRounds: number): string {
	const fromEnd = totalRounds - 1 - round;
	if (fromEnd === 0) return 'Final';
	if (fromEnd === 1) return 'Semifinal';
	if (fromEnd === 2) return 'Quarterfinal';
	return `Round ${round + 1}`;
}

/** Expected games in a best-of series (midpoint between a sweep and the max). */
function expectedGames(bestOf: number): number {
	if (bestOf <= 1) return 1;
	const min = Math.ceil((bestOf + 1) / 2);
	return (min + bestOf) / 2;
}

function estimateMinutes(matches: MatchSpec[], roundMinutes: number): number {
	const games = matches.reduce((s, m) => s + expectedGames(m.bestOf), 0);
	return Math.round(games * roundMinutes * 1.1); // 10% buffer for setup/transitions
}

/* ------------------------------------------------------------------ *
 * Strategies — each returns matches + a human rationale + config
 * ------------------------------------------------------------------ */
type StrategyResult = { matches: MatchSpec[]; rationale: string; config: Record<string, unknown> };

function singleMatch(ids: number[], bestOf: number): StrategyResult {
	return {
		matches: [
			{ ref: 'm1', round: 0, label: 'Everyone plays', slots: ids.map((id) => comp(id)), bestOf, kind: 'ffa' }
		],
		rationale: `All ${ids.length} players in one match.`,
		config: {}
	};
}

function roundRobin(ids: number[], bestOf: number): StrategyResult {
	const schedule = roundRobinSchedule(ids);
	const matches: MatchSpec[] = schedule.map((p, i) => ({
		ref: `rr-${i}`,
		round: p.round,
		label: `Round ${p.round + 1}`,
		slots: [comp(p.a), comp(p.b)],
		bestOf,
		kind: 'duel'
	}));
	return {
		matches,
		rationale: `Everyone plays everyone — ${matches.length} matches.`,
		config: { tiebreak: ['wins', 'headToHead', 'pointDiff'] }
	};
}

function singleElimination(ids: number[], bestOf: number): StrategyResult {
	const n = ids.length;
	let P = 1;
	while (P < n) P *= 2;
	const totalRounds = Math.log2(P);
	const order = seedOrder(P);

	let current: MatchSlot[] = order.map((seed) =>
		seed <= n ? comp(ids[seed - 1]) : { kind: 'bye' }
	);
	const matches: MatchSpec[] = [];
	let round = 0;

	while (current.length > 1) {
		const next: MatchSlot[] = [];
		const label = eliminationRoundLabel(round, totalRounds);
		let idx = 0;
		for (let i = 0; i < current.length; i += 2) {
			const a = current[i];
			const b = current[i + 1];
			const aBye = a.kind === 'bye';
			const bBye = b.kind === 'bye';
			if (aBye && bBye) {
				next.push({ kind: 'bye' });
				continue;
			}
			if (aBye) {
				next.push(b);
				continue;
			}
			if (bBye) {
				next.push(a);
				continue;
			}
			const ref = `se-r${round}-m${idx}`;
			matches.push({
				ref,
				round,
				label,
				slots: [a, b],
				bestOf,
				kind: round === totalRounds - 1 ? 'final' : 'duel'
			});
			next.push({ kind: 'winner', ref });
			idx++;
		}
		current = next;
		round++;
	}

	// Third-place match when there are two real semifinals feeding the final.
	const final = matches[matches.length - 1];
	const semiRefs = final.slots.filter((s) => s.kind === 'winner').map((s) => (s as { ref: string }).ref);
	if (semiRefs.length === 2) {
		matches.push({
			ref: 'se-3rd',
			round: totalRounds,
			label: 'Third place',
			slots: [
				{ kind: 'loser', ref: semiRefs[0] },
				{ kind: 'loser', ref: semiRefs[1] }
			],
			bestOf,
			kind: 'duel'
		});
	}

	return {
		matches,
		rationale: `Seeded single-elimination bracket${P > n ? ` (${P - n} bye${P - n > 1 ? 's' : ''})` : ''} with a third-place match.`,
		config: { bracketSize: P }
	};
}

function heatsFinal(ids: number[], maxPlayers: number, bestOf: number): StrategyResult {
	const n = ids.length;
	const H = Math.ceil(n / maxPlayers);
	const heats = distribute(ids, H);
	const matches: MatchSpec[] = [];
	const heatRefs: string[] = [];

	heats.forEach((heatIds, h) => {
		const ref = `heat-${h}`;
		heatRefs.push(ref);
		matches.push({
			ref,
			round: 0,
			group: h,
			label: `Heat ${letter(h)}`,
			slots: heatIds.map((id) => comp(id)),
			bestOf,
			kind: 'heat'
		});
	});

	// Grand final: rotate through places across heats until we fill min(maxPlayers, n) seats.
	const finalSize = Math.min(maxPlayers, n);
	const finalSlots: MatchSlot[] = [];
	for (let place = 1; finalSlots.length < finalSize && place <= n; place++) {
		for (let h = 0; h < H && finalSlots.length < finalSize; h++) {
			if (heats[h].length >= place) finalSlots.push({ kind: 'heatPlace', ref: heatRefs[h], place });
		}
	}
	matches.push({
		ref: 'grand-final',
		round: 1,
		label: 'Grand Final',
		slots: finalSlots,
		bestOf,
		kind: 'final'
	});

	return {
		matches,
		rationale: `${H} heats feed a grand final of the top ${finalSlots.length}.`,
		config: { heats: H, finalSize: finalSlots.length }
	};
}

function teamMatch(
	ids: number[],
	teamSize: number,
	maxPlayers: number,
	bestOf: number
): StrategyResult {
	const n = ids.length;
	const numTeams = Math.max(2, Math.floor(n / Math.max(1, teamSize)));
	const teams = distribute(ids, numTeams);

	// All teams fit in one match.
	if (n <= maxPlayers) {
		const slots: MatchSlot[] = [];
		teams.forEach((tIds, t) => tIds.forEach((id) => slots.push(comp(id, t))));
		return {
			matches: [{ ref: 'team-1', round: 0, label: `${numTeams} teams`, slots, bestOf, kind: 'team' }],
			rationale: `${numTeams} teams in a single match.`,
			config: { numTeams }
		};
	}

	// Otherwise a round-robin between teams (a pair of teams per match).
	const maxTeamPlayers = Math.max(...teams.map((t) => t.length));
	if (maxTeamPlayers * 2 <= maxPlayers) {
		const matches: MatchSpec[] = [];
		let idx = 0;
		for (let i = 0; i < numTeams; i++) {
			for (let j = i + 1; j < numTeams; j++) {
				const slots: MatchSlot[] = [
					...teams[i].map((id) => comp(id, 0)),
					...teams[j].map((id) => comp(id, 1))
				];
				matches.push({
					ref: `team-rr-${idx++}`,
					round: 0,
					label: `Team ${letter(i)} vs Team ${letter(j)}`,
					slots,
					bestOf,
					kind: 'team'
				});
			}
		}
		return {
			matches,
			rationale: `${numTeams} teams, round-robin (${matches.length} matches).`,
			config: { numTeams }
		};
	}

	// Fallback: as many teams as fit in one match.
	const slots: MatchSlot[] = [];
	let used = 0;
	teams.forEach((tIds, t) => {
		if (used + tIds.length <= maxPlayers) {
			tIds.forEach((id) => slots.push(comp(id, t)));
			used += tIds.length;
		}
	});
	return {
		matches: [{ ref: 'team-1', round: 0, label: `Teams`, slots, bestOf, kind: 'team' }],
		rationale: `Teams (a match only fits ${used} players).`,
		config: { numTeams }
	};
}

function coopScore(ids: number[], maxPlayers: number): StrategyResult {
	const n = ids.length;
	const H = Math.ceil(n / maxPlayers);
	const groups = distribute(ids, H);
	const matches: MatchSpec[] = groups.map((g, i) => ({
		ref: `run-${i}`,
		round: 0,
		group: i,
		label: H > 1 ? `Score run ${letter(i)}` : 'Score run',
		slots: g.map((id) => comp(id)),
		bestOf: 1,
		kind: 'score'
	}));
	return {
		matches,
		rationale: H > 1 ? `${H} score runs, ranked by score.` : 'One score run, ranked by score.',
		config: { runs: H }
	};
}

/** One-vs-all: everyone takes a turn as the lone player (team 0) against the pack (team 1). */
function oneVsAll(ids: number[]): StrategyResult {
	const matches: MatchSpec[] = ids.map((soloId, i) => ({
		ref: `solo-${i}`,
		round: i,
		label: `Solo round ${i + 1}`,
		slots: [comp(soloId, 0), ...ids.filter((id) => id !== soloId).map((id) => comp(id, 1))],
		bestOf: 1,
		kind: 'solo'
	}));
	return {
		matches,
		rationale: `Everyone takes a turn solo against the pack — ${matches.length} rounds.`,
		config: { rounds: matches.length }
	};
}

/* ------------------------------------------------------------------ *
 * Selection + planning
 * ------------------------------------------------------------------ */
function isPairwise(ctx: FormatContext): boolean {
	return ctx.maxPlayers <= 2 || ctx.mode === '1v1';
}

/** Which formats it makes sense to offer for this game + player count. */
export function eligibleFormats(ctx: FormatContext): FormatType[] {
	const n = ctx.competitorIds.length;
	if (ctx.mode === 'coop_score') return ['coop_score'];
	if (ctx.mode === 'one_vs_all') return ['one_vs_all'];
	if (ctx.mode === 'teams') return ['team_match'];
	if (isPairwise(ctx)) return ['round_robin', 'single_elimination'];
	if (n <= ctx.maxPlayers) return ['single_match'];
	return ['heats_final'];
}

/** The recommended (time-feasible) format. */
export function selectFormat(ctx: FormatContext): FormatType {
	const n = ctx.competitorIds.length;
	if (ctx.mode === 'coop_score') return 'coop_score';
	if (ctx.mode === 'one_vs_all') return 'one_vs_all';
	if (ctx.mode === 'teams') return 'team_match';
	if (isPairwise(ctx)) {
		const rrMinutes = ((n * (n - 1)) / 2) * ctx.roundMinutes;
		return rrMinutes <= ctx.timeBudgetMinutes ? 'round_robin' : 'single_elimination';
	}
	if (n <= ctx.maxPlayers) return 'single_match';
	return 'heats_final';
}

function defaultBestOf(): number {
	return 1;
}

/** Produce a full plan for a given (or auto-selected) format. */
export function planFormat(ctx: FormatContext): FormatPlan {
	const formatType = ctx.formatOverride ?? selectFormat(ctx);
	const bestOf = ctx.bestOf ?? defaultBestOf();
	const ids = ctx.competitorIds;
	const teamSize = ctx.teamSize ?? 2;

	let result: StrategyResult;
	switch (formatType) {
		case 'single_match':
			result = singleMatch(ids, bestOf);
			break;
		case 'round_robin':
			result = roundRobin(ids, bestOf);
			break;
		case 'single_elimination':
			result = singleElimination(ids, bestOf);
			break;
		case 'heats_final':
			result = heatsFinal(ids, ctx.maxPlayers, bestOf);
			break;
		case 'team_match':
			result = teamMatch(ids, teamSize, ctx.maxPlayers, bestOf);
			break;
		case 'coop_score':
			result = coopScore(ids, ctx.maxPlayers);
			break;
		case 'one_vs_all':
			result = oneVsAll(ids);
			break;
		default:
			result = singleMatch(ids, bestOf);
	}

	return {
		formatType,
		matches: result.matches,
		estimateMinutes: estimateMinutes(result.matches, ctx.roundMinutes),
		rationale: result.rationale,
		config: result.config
	};
}
