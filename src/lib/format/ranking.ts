import type { ScoringType } from '$lib/games';
import type { FormatType, MatchKind } from './types';

export type ResultEntry = {
	competitorId: number;
	placement: number; // 1 = best; for teams this is the team's rank
	score?: number;
	team?: number;
};

export type MatchResult = {
	ref: string;
	kind: MatchKind;
	round: number;
	group?: number;
	entries: ResultEntry[];
};

export type RankInput = {
	formatType: FormatType;
	scoringType: ScoringType;
	teamSize: number;
	pointsScheme: number[]; // e.g. [3, 2, 1]
	competitorIds: number[]; // seed order (tiebreak fallback)
	matches: MatchResult[];
};

export type RankedResult = { competitorId: number; rank: number; points: number };

const seedIndex = (ids: number[]) => new Map(ids.map((id, i) => [id, i]));

function applyScheme(ordered: number[], scheme: number[]): RankedResult[] {
	return ordered.map((id, i) => ({ competitorId: id, rank: i + 1, points: scheme[i] ?? 0 }));
}

function rankSingleMatch(input: RankInput): number[] {
	const m = input.matches[0];
	if (!m) return input.competitorIds;
	return [...m.entries].sort((a, b) => a.placement - b.placement).map((e) => e.competitorId);
}

function rankCoop(input: RankInput): number[] {
	const score = new Map<number, number>();
	for (const m of input.matches) for (const e of m.entries) if (e.score !== undefined) score.set(e.competitorId, e.score);
	const lowerIsBetter = input.scoringType === 'time';
	const seed = seedIndex(input.competitorIds);
	return [...input.competitorIds].sort((a, b) => {
		const sa = score.get(a);
		const sb = score.get(b);
		if (sa === undefined && sb === undefined) return seed.get(a)! - seed.get(b)!;
		if (sa === undefined) return 1;
		if (sb === undefined) return -1;
		if (sa !== sb) return lowerIsBetter ? sa - sb : sb - sa;
		return seed.get(a)! - seed.get(b)!;
	});
}

function rankRoundRobin(input: RankInput): number[] {
	const wins = new Map<number, number>(input.competitorIds.map((id) => [id, 0]));
	const beat = new Set<string>(); // "winner>loser"
	for (const m of input.matches) {
		if (m.entries.length !== 2) continue;
		const [x, y] = m.entries;
		const winner = x.placement <= y.placement ? x : y;
		const loser = winner === x ? y : x;
		wins.set(winner.competitorId, (wins.get(winner.competitorId) ?? 0) + 1);
		beat.add(`${winner.competitorId}>${loser.competitorId}`);
	}
	const seed = seedIndex(input.competitorIds);
	return [...input.competitorIds].sort((a, b) => {
		const wd = (wins.get(b) ?? 0) - (wins.get(a) ?? 0);
		if (wd) return wd;
		if (beat.has(`${a}>${b}`)) return -1;
		if (beat.has(`${b}>${a}`)) return 1;
		return seed.get(a)! - seed.get(b)!;
	});
}

/**
 * One-vs-all: everyone is the lone player exactly once. A player "wins a round" if they were
 * the solo and beat the pack, or were in the pack when it stopped the solo. Rank by rounds won,
 * then by the harder feat (winning your own solo round), then seed.
 */
function rankOneVsAll(input: RankInput): number[] {
	const roundsWon = new Map<number, number>(input.competitorIds.map((id) => [id, 0]));
	const soloWins = new Map<number, number>(input.competitorIds.map((id) => [id, 0]));
	for (const m of input.matches) {
		const solo = m.entries.find((e) => e.team === 0);
		if (!solo) continue;
		if (solo.placement === 1) {
			roundsWon.set(solo.competitorId, (roundsWon.get(solo.competitorId) ?? 0) + 1);
			soloWins.set(solo.competitorId, (soloWins.get(solo.competitorId) ?? 0) + 1);
		} else {
			for (const e of m.entries) {
				if (e.team === 1) roundsWon.set(e.competitorId, (roundsWon.get(e.competitorId) ?? 0) + 1);
			}
		}
	}
	const seed = seedIndex(input.competitorIds);
	return [...input.competitorIds].sort((a, b) => {
		const rd = (roundsWon.get(b) ?? 0) - (roundsWon.get(a) ?? 0);
		if (rd) return rd;
		const sd = (soloWins.get(b) ?? 0) - (soloWins.get(a) ?? 0);
		if (sd) return sd;
		return seed.get(a)! - seed.get(b)!;
	});
}

function rankElimination(input: RankInput): number[] {
	const finalM = input.matches.find((m) => m.kind === 'final');
	const thirdM = input.matches.find((m) => m.ref === 'se-3rd');
	const winnerOf = (m: MatchResult) => m.entries.find((e) => e.placement === 1)?.competitorId;
	const loserOf = (m: MatchResult) =>
		[...m.entries].sort((a, b) => b.placement - a.placement)[0]?.competitorId;

	const placed: number[] = [];
	const placedSet = new Set<number>();
	const place = (id: number | undefined) => {
		if (id !== undefined && !placedSet.has(id)) {
			placed.push(id);
			placedSet.add(id);
		}
	};
	if (finalM) {
		place(winnerOf(finalM));
		place(loserOf(finalM));
	}
	if (thirdM) {
		place(winnerOf(thirdM));
		place(loserOf(thirdM));
	}

	// Everyone else: ordered by the round they were eliminated (later = better), then seed.
	const exit = new Map<number, number>();
	for (const m of input.matches) {
		if (m === thirdM) continue;
		for (const e of m.entries) {
			if (e.placement !== 1) exit.set(e.competitorId, Math.max(exit.get(e.competitorId) ?? -1, m.round));
		}
	}
	const seed = seedIndex(input.competitorIds);
	const rest = input.competitorIds.filter((id) => !placedSet.has(id));
	rest.sort((a, b) => {
		const rd = (exit.get(b) ?? -1) - (exit.get(a) ?? -1);
		return rd || seed.get(a)! - seed.get(b)!;
	});
	return [...placed, ...rest];
}

function rankHeats(input: RankInput): number[] {
	const finalM = input.matches.find((m) => m.kind === 'final');
	const finalists = finalM
		? [...finalM.entries].sort((a, b) => a.placement - b.placement).map((e) => e.competitorId)
		: [];
	const finalistSet = new Set(finalists);
	const heatPlace = new Map<number, number>();
	for (const m of input.matches) if (m.kind === 'heat') for (const e of m.entries) heatPlace.set(e.competitorId, e.placement);
	const seed = seedIndex(input.competitorIds);
	const rest = input.competitorIds.filter((id) => !finalistSet.has(id));
	rest.sort((a, b) => {
		const pd = (heatPlace.get(a) ?? 99) - (heatPlace.get(b) ?? 99);
		return pd || seed.get(a)! - seed.get(b)!;
	});
	return [...finalists, ...rest];
}

function rankTeams(input: RankInput): RankedResult[] {
	const teamOf = new Map<number, number>();
	for (const m of input.matches) for (const e of m.entries) if (e.team !== undefined) teamOf.set(e.competitorId, e.team);

	const teamRank = new Map<number, number>();
	if (input.matches.length === 1) {
		for (const e of input.matches[0].entries) if (e.team !== undefined) teamRank.set(e.team, e.placement);
	} else {
		const wins = new Map<number, number>();
		for (const m of input.matches) {
			const wteam = m.entries.find((e) => e.placement === 1)?.team;
			if (wteam !== undefined) wins.set(wteam, (wins.get(wteam) ?? 0) + 1);
		}
		const teams = [...new Set(teamOf.values())].sort((a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0));
		teams.forEach((t, i) => teamRank.set(t, i + 1));
	}

	const seed = seedIndex(input.competitorIds);
	const ordered = [...input.competitorIds].sort((a, b) => {
		const ra = teamRank.get(teamOf.get(a) ?? -1) ?? 99;
		const rb = teamRank.get(teamOf.get(b) ?? -1) ?? 99;
		return ra - rb || seed.get(a)! - seed.get(b)!;
	});

	// Team rule: only the winning team scores; 6 points split (floored, min 1) among its members.
	const winningTeam = [...teamRank.entries()].find(([, r]) => r === 1)?.[0];
	const winningSize = [...teamOf.values()].filter((t) => t === winningTeam).length || 1;
	const perMember = Math.max(1, Math.floor(6 / winningSize));
	return ordered.map((id, i) => ({
		competitorId: id,
		rank: i + 1,
		points: teamRank.get(teamOf.get(id) ?? -1) === 1 ? perMember : 0
	}));
}

export type TieGroup = { competitorIds: number[]; minPosition: number };

/**
 * The "earned" standing key per competitor for formats where genuine ties can occur:
 * equal wins (round robin) or equal score (co-op). Same key ⇒ tied. Other formats can't tie
 * (distinct placements / bracket results), so they return null.
 */
function earnedKey(input: RankInput): Map<number, number> | null {
	if (input.formatType === 'round_robin') {
		const wins = new Map<number, number>(input.competitorIds.map((id) => [id, 0]));
		for (const m of input.matches) {
			if (m.entries.length !== 2) continue;
			const [x, y] = m.entries;
			const w = x.placement <= y.placement ? x.competitorId : y.competitorId;
			wins.set(w, (wins.get(w) ?? 0) + 1);
		}
		return wins;
	}
	if (input.formatType === 'coop_score') {
		const score = new Map<number, number>();
		for (const m of input.matches) for (const e of m.entries) if (e.score !== undefined) score.set(e.competitorId, e.score);
		return new Map(input.competitorIds.map((id) => [id, score.get(id) ?? Number.NEGATIVE_INFINITY]));
	}
	return null;
}

/** Ranking plus any ties that land on a scoring (podium) position and need a decider. */
export function rankGameWithTies(input: RankInput): { results: RankedResult[]; ties: TieGroup[] } {
	const results = rankGame(input);
	const key = earnedKey(input);
	if (!key) return { results, ties: [] };

	const scoringPositions = input.pointsScheme.length;
	const rankOf = new Map(results.map((r) => [r.competitorId, r.rank]));
	const groups = new Map<number, number[]>();
	for (const r of results) {
		const k = key.get(r.competitorId) ?? 0;
		const arr = groups.get(k) ?? [];
		arr.push(r.competitorId);
		groups.set(k, arr);
	}

	const ties: TieGroup[] = [];
	for (const ids of groups.values()) {
		if (ids.length < 2) continue;
		const minPosition = Math.min(...ids.map((id) => rankOf.get(id)!));
		if (minPosition <= scoringPositions) ties.push({ competitorIds: ids, minPosition });
	}
	return { results, ties };
}

/** Re-order each tied group by its played-off decider order, then re-apply points by position. */
export function applyDeciders(
	base: RankedResult[],
	deciderOrders: number[][],
	pointsScheme: number[]
): RankedResult[] {
	const order = base.map((r) => r.competitorId);
	for (const deciderOrder of deciderOrders) {
		const group = new Set(deciderOrder);
		const positions: number[] = [];
		order.forEach((id, i) => {
			if (group.has(id)) positions.push(i);
		});
		positions.forEach((pos, k) => {
			order[pos] = deciderOrder[k];
		});
	}
	return order.map((id, i) => ({ competitorId: id, rank: i + 1, points: pointsScheme[i] ?? 0 }));
}

/** Full ranking + competition points for a completed game. */
export function rankGame(input: RankInput): RankedResult[] {
	if (input.formatType === 'team_match') return rankTeams(input);
	let ordered: number[];
	switch (input.formatType) {
		case 'coop_score':
			ordered = rankCoop(input);
			break;
		case 'round_robin':
			ordered = rankRoundRobin(input);
			break;
		case 'one_vs_all':
			ordered = rankOneVsAll(input);
			break;
		case 'single_elimination':
			ordered = rankElimination(input);
			break;
		case 'heats_final':
			ordered = rankHeats(input);
			break;
		default:
			ordered = rankSingleMatch(input);
	}
	return applyScheme(ordered, input.pointsScheme);
}
