import {
	applyDeciders,
	rankGameWithTies,
	type MatchResult,
	type ResultEntry
} from '$lib/format/ranking';
import type { FormatType, MatchKind } from '$lib/format/types';
import type { ScoringType } from '$lib/games';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { refToText } from './materialize';

function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export type RunnerParticipant = {
	pid: number;
	competitorId: number | null;
	name: string | null;
	color: string | null;
	team: number | null;
	placement: number | null;
	score: number | null;
	sourceLabel: string | null;
};

export type RunnerMatch = {
	id: number;
	label: string;
	kind: string;
	round: number;
	group: number | null;
	status: string;
	participants: RunnerParticipant[];
};

export type RunnerState = {
	matches: RunnerMatch[];
	currentMatchId: number | null;
	done: number;
	total: number;
};

/** Everything the match runner needs: matches with resolved participants + the current playable match. */
export function getRunnerState(cgId: number): RunnerState {
	const matchRows = db
		.select()
		.from(schema.matches)
		.where(eq(schema.matches.competitionGameId, cgId))
		.orderBy(asc(schema.matches.orderIndex))
		.all();
	const refLabel = new Map(matchRows.map((m) => [m.bracketSlot ?? '', m.label ?? '']));

	const parts = db
		.select({
			pid: schema.matchParticipants.id,
			matchId: schema.matchParticipants.matchId,
			competitorId: schema.matchParticipants.competitorId,
			teamIndex: schema.matchParticipants.teamIndex,
			placement: schema.matchParticipants.placement,
			rawScore: schema.matchParticipants.rawScore,
			sourceRef: schema.matchParticipants.sourceRef,
			name: schema.competitors.name,
			color: schema.competitors.color
		})
		.from(schema.matchParticipants)
		.innerJoin(schema.matches, eq(schema.matches.id, schema.matchParticipants.matchId))
		.leftJoin(schema.competitors, eq(schema.competitors.id, schema.matchParticipants.competitorId))
		.where(eq(schema.matches.competitionGameId, cgId))
		.all();

	const byMatch = new Map<number, RunnerParticipant[]>();
	for (const p of parts) {
		const arr = byMatch.get(p.matchId) ?? [];
		arr.push({
			pid: p.pid,
			competitorId: p.competitorId,
			name: p.name,
			color: p.color,
			team: p.teamIndex,
			placement: p.placement,
			score: p.rawScore,
			sourceLabel: p.competitorId ? null : refToText(p.sourceRef, refLabel)
		});
		byMatch.set(p.matchId, arr);
	}

	const matches: RunnerMatch[] = matchRows.map((m) => ({
		id: m.id,
		label: m.label ?? '',
		kind: m.kind ?? '',
		round: m.roundIndex,
		group: m.groupIndex,
		status: m.status,
		participants: byMatch.get(m.id) ?? []
	}));

	const current = matches.find(
		(m) => m.status !== 'finished' && m.participants.every((p) => p.competitorId !== null)
	);

	return {
		matches,
		currentMatchId: current?.id ?? null,
		done: matches.filter((m) => m.status === 'finished').length,
		total: matches.length
	};
}

export type SaveEntry = {
	competitorId: number;
	placement: number;
	score?: number | null;
	stats?: Record<string, number | null>;
};

/** Record a match result: placements, stats, resolve downstream refs, and finalize the game if done. */
export function saveMatchResult(matchId: number, entries: SaveEntry[]): void {
	db.transaction((tx) => {
		const match = tx.select().from(schema.matches).where(eq(schema.matches.id, matchId)).get();
		if (!match) throw new Error('Match not found');
		const cgId = match.competitionGameId;

		// 1. Placements + stats.
		tx.delete(schema.statEntries).where(eq(schema.statEntries.matchId, matchId)).run();
		for (const e of entries) {
			tx.update(schema.matchParticipants)
				.set({ placement: e.placement, rawScore: e.score ?? null, isWinner: e.placement === 1 })
				.where(
					and(
						eq(schema.matchParticipants.matchId, matchId),
						eq(schema.matchParticipants.competitorId, e.competitorId)
					)
				)
				.run();
			for (const [k, v] of Object.entries(e.stats ?? {})) {
				if (v === null || v === undefined || Number.isNaN(v)) continue;
				tx.insert(schema.statEntries)
					.values({ competitionGameId: cgId, matchId, competitorId: e.competitorId, statKey: k, valueNum: v })
					.run();
			}
		}

		tx.update(schema.matches).set({ status: 'finished' }).where(eq(schema.matches.id, matchId)).run();

		// 2. Resolve downstream references (winners / losers / heat places).
		const ref = match.bracketSlot;
		if (ref) {
			const sorted = [...entries].sort((a, b) => a.placement - b.placement);
			const winner = sorted[0]?.competitorId;
			const loser = sorted[sorted.length - 1]?.competitorId;
			const byPlace = new Map(entries.map((e) => [e.placement, e.competitorId]));

			const pending = tx
				.select({ pid: schema.matchParticipants.id, sourceRef: schema.matchParticipants.sourceRef })
				.from(schema.matchParticipants)
				.innerJoin(schema.matches, eq(schema.matches.id, schema.matchParticipants.matchId))
				.where(
					and(
						eq(schema.matches.competitionGameId, cgId),
						isNull(schema.matchParticipants.competitorId)
					)
				)
				.all();

			for (const p of pending) {
				const sr = p.sourceRef;
				if (!sr) continue;
				let resolved: number | undefined;
				if (sr === `winner:${ref}`) resolved = winner;
				else if (sr === `loser:${ref}`) resolved = loser;
				else if (sr.startsWith(`heat:${ref}#`)) resolved = byPlace.get(Number(sr.split('#')[1]));
				if (resolved !== undefined) {
					tx.update(schema.matchParticipants)
						.set({ competitorId: resolved })
						.where(eq(schema.matchParticipants.id, p.pid))
						.run();
				}
			}
		}

		// 3. Finalize the game (and maybe the competition) if every match is done.
		const remaining = tx
			.select({ n: sql<number>`count(*)` })
			.from(schema.matches)
			.where(and(eq(schema.matches.competitionGameId, cgId), ne(schema.matches.status, 'finished')))
			.get();
		if ((remaining?.n ?? 0) > 0) return;

		const cg = tx
			.select({
				formatType: schema.competitionGames.formatType,
				teamSize: schema.competitionGames.teamSize,
				maxPlayers: schema.competitionGames.maxPlayers,
				competitionId: schema.competitionGames.competitionId,
				scoringType: schema.games.scoringType
			})
			.from(schema.competitionGames)
			.innerJoin(schema.games, eq(schema.games.id, schema.competitionGames.gameId))
			.where(eq(schema.competitionGames.id, cgId))
			.get();
		if (!cg) return;

		const competition = tx
			.select()
			.from(schema.competitions)
			.where(eq(schema.competitions.id, cg.competitionId))
			.get();
		const competitorRows = tx
			.select({ id: schema.competitors.id })
			.from(schema.competitors)
			.where(eq(schema.competitors.competitionId, cg.competitionId))
			.orderBy(asc(schema.competitors.id))
			.all();
		const matchRows = tx
			.select()
			.from(schema.matches)
			.where(eq(schema.matches.competitionGameId, cgId))
			.orderBy(asc(schema.matches.orderIndex))
			.all();
		const partRows = tx
			.select({
				matchId: schema.matchParticipants.matchId,
				competitorId: schema.matchParticipants.competitorId,
				placement: schema.matchParticipants.placement,
				rawScore: schema.matchParticipants.rawScore,
				teamIndex: schema.matchParticipants.teamIndex
			})
			.from(schema.matchParticipants)
			.innerJoin(schema.matches, eq(schema.matches.id, schema.matchParticipants.matchId))
			.where(eq(schema.matches.competitionGameId, cgId))
			.all();

		const entriesByMatch = new Map<number, ResultEntry[]>();
		for (const p of partRows) {
			if (p.competitorId === null || p.placement === null) continue;
			const arr = entriesByMatch.get(p.matchId) ?? [];
			arr.push({
				competitorId: p.competitorId,
				placement: p.placement,
				score: p.rawScore ?? undefined,
				team: p.teamIndex ?? undefined
			});
			entriesByMatch.set(p.matchId, arr);
		}

		const pointsScheme = competition?.pointsScheme ?? [3, 2, 1];
		const isDecider = (slot: string | null) => (slot ?? '').startsWith('decider-');
		const toResults = (rows: typeof matchRows): MatchResult[] =>
			rows.map((mr) => ({
				ref: mr.bracketSlot ?? '',
				kind: (mr.kind ?? 'ffa') as MatchKind,
				round: mr.roundIndex,
				group: mr.groupIndex ?? undefined,
				entries: entriesByMatch.get(mr.id) ?? []
			}));

		const regularMatches = matchRows.filter((m) => !isDecider(m.bracketSlot));
		const deciderMatches = matchRows.filter((m) => isDecider(m.bracketSlot));

		const { results, ties } = rankGameWithTies({
			formatType: cg.formatType as FormatType,
			scoringType: cg.scoringType as ScoringType,
			teamSize: cg.teamSize ?? 2,
			pointsScheme,
			competitorIds: competitorRows.map((c) => c.id),
			matches: toResults(regularMatches)
		});

		// A tie is only settleable if the tied players fit into one decider match.
		const decidable = ties.filter((t) => t.competitorIds.length <= cg.maxPlayers);

		if (decidable.length > 0 && deciderMatches.length === 0) {
			// Spawn sudden-death deciders and stay active — the runner surfaces them next.
			const baseOrder = Math.max(0, ...matchRows.map((m) => m.orderIndex)) + 1;
			decidable.forEach((tie, i) => {
				const twoWay = tie.competitorIds.length === 2;
				const row = tx
					.insert(schema.matches)
					.values({
						competitionGameId: cgId,
						roundIndex: 100,
						bracketSlot: `decider-${i}`,
						label: `Tiebreaker for ${ordinal(tie.minPosition)}${twoWay ? ' · best of 3' : ''}`,
						kind: twoWay ? 'duel' : 'ffa',
						bestOf: twoWay ? 3 : 1,
						orderIndex: baseOrder + i,
						status: 'pending'
					})
					.returning({ id: schema.matches.id })
					.get();
				for (const cid of tie.competitorIds) {
					tx.insert(schema.matchParticipants).values({ matchId: row.id, competitorId: cid }).run();
				}
			});
			return;
		}

		// Finalize: fold decider outcomes into the base ranking, then write results.
		const deciderOrders = deciderMatches.map((dm) =>
			(entriesByMatch.get(dm.id) ?? [])
				.slice()
				.sort((a, b) => a.placement - b.placement)
				.map((e) => e.competitorId)
		);
		const finalResults = deciderOrders.length
			? applyDeciders(results, deciderOrders, pointsScheme)
			: results;

		tx.delete(schema.gameResults).where(eq(schema.gameResults.competitionGameId, cgId)).run();
		for (const r of finalResults) {
			tx.insert(schema.gameResults)
				.values({
					competitionGameId: cgId,
					competitorId: r.competitorId,
					finalRank: r.rank,
					competitionPoints: r.points
				})
				.run();
		}
		tx.update(schema.competitionGames)
			.set({ status: 'finished', finishedAt: new Date() })
			.where(eq(schema.competitionGames.id, cgId))
			.run();

		const remComp = tx
			.select({ n: sql<number>`count(*)` })
			.from(schema.competitionGames)
			.where(
				and(
					eq(schema.competitionGames.competitionId, cg.competitionId),
					ne(schema.competitionGames.status, 'finished')
				)
			)
			.get();
		if ((remComp?.n ?? 0) === 0) {
			tx.update(schema.competitions)
				.set({ status: 'finished', finishedAt: new Date() })
				.where(eq(schema.competitions.id, cg.competitionId))
				.run();
		}
	});
}

export type GameResultRow = {
	competitorId: number;
	name: string;
	color: string;
	rank: number;
	points: number;
};

/** Final standings for one finished game. */
export function getGameResults(cgId: number): GameResultRow[] {
	return db
		.select({
			competitorId: schema.gameResults.competitorId,
			name: schema.competitors.name,
			color: schema.competitors.color,
			rank: schema.gameResults.finalRank,
			points: schema.gameResults.competitionPoints
		})
		.from(schema.gameResults)
		.innerJoin(schema.competitors, eq(schema.competitors.id, schema.gameResults.competitorId))
		.where(eq(schema.gameResults.competitionGameId, cgId))
		.orderBy(asc(schema.gameResults.finalRank))
		.all();
}
