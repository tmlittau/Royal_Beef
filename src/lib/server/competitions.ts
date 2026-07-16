import { colorForIndex } from '$lib/games';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from './db';
import { getPickState, shuffle } from './picking';

export type CreateCompetitionInput = {
	name: string;
	timeBudgetMinutes: number;
	gamesPerPlayer: number;
	competitorNames: string[];
};

/**
 * Create a competition + competitors and start it in the "controllers" phase.
 * Games are picked dynamically later; the reveal order is a shuffle of the competitors.
 */
export function createCompetition(input: CreateCompetitionInput): number {
	return db.transaction((tx) => {
		const comp = tx
			.insert(schema.competitions)
			.values({
				name: input.name,
				status: 'controllers',
				timeBudgetMinutes: input.timeBudgetMinutes,
				gamesPerPlayer: input.gamesPerPlayer
			})
			.returning({ id: schema.competitions.id })
			.get();

		const ids: number[] = [];
		input.competitorNames.forEach((name, i) => {
			const c = tx
				.insert(schema.competitors)
				.values({ competitionId: comp.id, name, color: colorForIndex(i) })
				.returning({ id: schema.competitors.id })
				.get();
			ids.push(c.id);
		});

		tx.update(schema.competitions)
			.set({ controllerOrder: shuffle(ids) })
			.where(eq(schema.competitions.id, comp.id))
			.run();

		return comp.id;
	});
}

export type StandingRow = {
	id: number;
	name: string;
	color: string;
	controllerImage: string | null;
	points: number;
	gamesPlayed: number;
};

/** Live standings: total competition points per competitor (0 until games are scored). */
export function getStandings(competitionId: number): StandingRow[] {
	return db
		.select({
			id: schema.competitors.id,
			name: schema.competitors.name,
			color: schema.competitors.color,
			controllerImage: schema.controllers.image,
			points: sql<number>`coalesce(sum(${schema.gameResults.competitionPoints}), 0)`,
			gamesPlayed: sql<number>`count(${schema.gameResults.id})`
		})
		.from(schema.competitors)
		.leftJoin(schema.gameResults, eq(schema.gameResults.competitorId, schema.competitors.id))
		.leftJoin(schema.controllers, eq(schema.controllers.id, schema.competitors.controllerId))
		.where(eq(schema.competitors.competitionId, competitionId))
		.groupBy(schema.competitors.id)
		.orderBy(
			sql`coalesce(sum(${schema.gameResults.competitionPoints}), 0) desc`,
			asc(schema.competitors.name)
		)
		.all();
}

export type CompetitionGameRow = {
	cgId: number;
	gameId: number;
	orderIndex: number;
	status: 'pending' | 'active' | 'finished';
	mode: string;
	maxPlayers: number;
	roundMinutes: number;
	formatType: string | null;
	name: string;
	coverUrl: string | null;
	pickRound: number | null;
	pickedByName: string | null;
	pickedByColor: string | null;
};

/** Full overview for the competition hub. */
export function getCompetitionOverview(competitionId: number) {
	const competition = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, competitionId))
		.get();
	if (!competition) return null;

	const games: CompetitionGameRow[] = db
		.select({
			cgId: schema.competitionGames.id,
			gameId: schema.competitionGames.gameId,
			orderIndex: schema.competitionGames.orderIndex,
			status: schema.competitionGames.status,
			mode: schema.competitionGames.mode,
			maxPlayers: schema.competitionGames.maxPlayers,
			roundMinutes: schema.competitionGames.roundMinutes,
			formatType: schema.competitionGames.formatType,
			name: schema.games.name,
			coverUrl: schema.games.coverUrl,
			pickRound: schema.competitionGames.pickRound,
			pickedByName: schema.competitors.name,
			pickedByColor: schema.competitors.color
		})
		.from(schema.competitionGames)
		.innerJoin(schema.games, eq(schema.games.id, schema.competitionGames.gameId))
		.leftJoin(schema.competitors, eq(schema.competitors.id, schema.competitionGames.pickedBy))
		.where(eq(schema.competitionGames.competitionId, competitionId))
		.orderBy(asc(schema.competitionGames.orderIndex))
		.all();

	return {
		competition,
		standings: getStandings(competitionId),
		games,
		pick: getPickState(competitionId),
		activeGameId: games.find((g) => g.status !== 'finished')?.cgId ?? null
	};
}

export type CompetitionListRow = {
	id: number;
	name: string;
	status: 'setup' | 'controllers' | 'active' | 'finished';
	createdAt: Date;
	competitorCount: number;
	gameCount: number;
};

/** All competitions with counts, newest first — for the dashboard. */
export function listCompetitions(): CompetitionListRow[] {
	const comps = db
		.select()
		.from(schema.competitions)
		.orderBy(desc(schema.competitions.createdAt))
		.all();

	const competitorCounts = new Map<number, number>();
	for (const r of db
		.select({
			competitionId: schema.competitors.competitionId,
			n: sql<number>`count(*)`
		})
		.from(schema.competitors)
		.groupBy(schema.competitors.competitionId)
		.all()) {
		competitorCounts.set(r.competitionId, r.n);
	}

	const gameCounts = new Map<number, number>();
	for (const r of db
		.select({
			competitionId: schema.competitionGames.competitionId,
			n: sql<number>`count(*)`
		})
		.from(schema.competitionGames)
		.groupBy(schema.competitionGames.competitionId)
		.all()) {
		gameCounts.set(r.competitionId, r.n);
	}

	return comps.map((c) => ({
		id: c.id,
		name: c.name,
		status: c.status,
		createdAt: c.createdAt,
		competitorCount: competitorCounts.get(c.id) ?? 0,
		gameCount: gameCounts.get(c.id) ?? 0
	}));
}
