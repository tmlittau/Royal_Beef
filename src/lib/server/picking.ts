import { and, asc, eq, sql } from 'drizzle-orm';
import { db, schema } from './db';

export const CONTROLLERS_DIR = process.env.CONTROLLERS_DIR ?? 'data/controllers';

export function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * The next player to pick a game: a random competitor who hasn't yet picked in the current
 * round (round = ceil(pickNumber / players)). Null when every game has been picked.
 */
export function computeNextPicker(
	pickedGames: { pickedBy: number | null; pickRound: number | null }[],
	competitorIds: number[]
): number | null {
	const playerCount = competitorIds.length;
	if (playerCount === 0) return null;
	const gamesPicked = pickedGames.length;
	const nextRound = Math.floor(gamesPicked / playerCount) + 1;
	const pickedThisRound = new Set(
		pickedGames.filter((g) => g.pickRound === nextRound).map((g) => g.pickedBy)
	);
	const pool = competitorIds.filter((id) => !pickedThisRound.has(id));
	if (pool.length === 0) return null;
	return pool[Math.floor(Math.random() * pool.length)];
}

/* ------------------------------------------------------------------ *
 * Controller selection ("pick your weapon")
 * ------------------------------------------------------------------ */
export type ControllerOption = {
	id: number;
	image: string;
	label: string;
	available: number;
	taken: boolean;
};

export function getControllerSelection(competitionId: number) {
	const comp = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, competitionId))
		.get();
	if (!comp) return null;

	const competitors = db
		.select({
			id: schema.competitors.id,
			name: schema.competitors.name,
			color: schema.competitors.color,
			controllerId: schema.competitors.controllerId,
			controllerImage: schema.controllers.image,
			controllerLabel: schema.controllers.label
		})
		.from(schema.competitors)
		.leftJoin(schema.controllers, eq(schema.controllers.id, schema.competitors.controllerId))
		.where(eq(schema.competitors.competitionId, competitionId))
		.orderBy(asc(schema.competitors.id))
		.all();
	const byId = new Map(competitors.map((c) => [c.id, c]));

	const order = comp.controllerOrder;
	const index = comp.controllerPickIndex;
	const currentId = index < order.length ? order[index] : null;
	const current = currentId != null ? (byId.get(currentId) ?? null) : null;

	const inv = db
		.select()
		.from(schema.controllers)
		.orderBy(asc(schema.controllers.sortIndex))
		.all();
	const used = new Map<number, number>();
	for (const c of competitors) if (c.controllerId != null) used.set(c.controllerId, (used.get(c.controllerId) ?? 0) + 1);
	const controllers: ControllerOption[] = inv.map((ct) => {
		const available = ct.quantity - (used.get(ct.id) ?? 0);
		return { id: ct.id, image: ct.image, label: ct.label, available, taken: available <= 0 };
	});

	return {
		competitionId,
		done: index >= order.length,
		index,
		total: order.length,
		currentCompetitorId: currentId,
		currentName: current?.name ?? null,
		currentColor: current?.color ?? null,
		competitors: competitors.map((c) => ({
			id: c.id,
			name: c.name,
			color: c.color,
			controllerImage: c.controllerImage,
			controllerLabel: c.controllerLabel,
			picked: c.controllerId != null
		})),
		controllers
	};
}

/** Assign the current player's controller (or skip with null), advance, and start picking when done. */
export function pickController(competitionId: number, controllerId: number | null): void {
	db.transaction((tx) => {
		const comp = tx
			.select()
			.from(schema.competitions)
			.where(eq(schema.competitions.id, competitionId))
			.get();
		if (!comp || comp.status !== 'controllers') return;

		const order = comp.controllerOrder;
		const index = comp.controllerPickIndex;
		if (index >= order.length) return;
		const competitorId = order[index];

		if (controllerId != null) {
			const inv = tx
				.select()
				.from(schema.controllers)
				.where(eq(schema.controllers.id, controllerId))
				.get();
			if (inv) {
				const usedRow = tx
					.select({ n: sql<number>`count(*)` })
					.from(schema.competitors)
					.where(
						and(
							eq(schema.competitors.competitionId, competitionId),
							eq(schema.competitors.controllerId, controllerId)
						)
					)
					.get();
				if (inv.quantity - (usedRow?.n ?? 0) > 0) {
					tx.update(schema.competitors)
						.set({ controllerId })
						.where(eq(schema.competitors.id, competitorId))
						.run();
				}
			}
		}

		const newIndex = index + 1;
		if (newIndex < order.length) {
			tx.update(schema.competitions)
				.set({ controllerPickIndex: newIndex })
				.where(eq(schema.competitions.id, competitionId))
				.run();
		} else {
			// Everyone has chosen — kick off game picking.
			const competitorIds = tx
				.select({ id: schema.competitors.id })
				.from(schema.competitors)
				.where(eq(schema.competitors.competitionId, competitionId))
				.orderBy(asc(schema.competitors.id))
				.all()
				.map((c) => c.id);
			tx.update(schema.competitions)
				.set({
					controllerPickIndex: newIndex,
					status: 'active',
					currentPickerId: computeNextPicker([], competitorIds)
				})
				.where(eq(schema.competitions.id, competitionId))
				.run();
		}
	});
}

/* ------------------------------------------------------------------ *
 * Game picking
 * ------------------------------------------------------------------ */
export type PickState = {
	currentPickerId: number | null;
	currentName: string | null;
	currentColor: string | null;
	round: number;
	totalRounds: number;
	pickNumber: number;
	totalGames: number;
};

export function getPickState(competitionId: number): PickState | null {
	const comp = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, competitionId))
		.get();
	if (!comp) return null;
	const competitors = db
		.select()
		.from(schema.competitors)
		.where(eq(schema.competitors.competitionId, competitionId))
		.all();
	const playerCount = Math.max(1, competitors.length);
	const gamesPicked =
		db
			.select({ n: sql<number>`count(*)` })
			.from(schema.competitionGames)
			.where(eq(schema.competitionGames.competitionId, competitionId))
			.get()?.n ?? 0;
	const picker = comp.currentPickerId != null ? competitors.find((c) => c.id === comp.currentPickerId) : null;
	return {
		currentPickerId: comp.currentPickerId,
		currentName: picker?.name ?? null,
		currentColor: picker?.color ?? null,
		round: Math.floor(gamesPicked / playerCount) + 1,
		totalRounds: comp.gamesPerPlayer,
		pickNumber: gamesPicked + 1,
		totalGames: comp.gamesPerPlayer * competitors.length
	};
}

/** The current picker chooses a library game → create the competition game, return its id. */
export function pickGame(competitionId: number, gameId: number): number | null {
	return db.transaction((tx) => {
		const comp = tx
			.select()
			.from(schema.competitions)
			.where(eq(schema.competitions.id, competitionId))
			.get();
		if (!comp || comp.status !== 'active' || comp.currentPickerId == null) return null;
		const game = tx.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
		if (!game) return null;

		const competitorIds = tx
			.select({ id: schema.competitors.id })
			.from(schema.competitors)
			.where(eq(schema.competitors.competitionId, competitionId))
			.all()
			.map((c) => c.id);
		const gamesPicked =
			tx
				.select({ n: sql<number>`count(*)` })
				.from(schema.competitionGames)
				.where(eq(schema.competitionGames.competitionId, competitionId))
				.get()?.n ?? 0;
		const pickRound = Math.floor(gamesPicked / Math.max(1, competitorIds.length)) + 1;

		const cg = tx
			.insert(schema.competitionGames)
			.values({
				competitionId,
				gameId,
				orderIndex: gamesPicked,
				status: 'pending',
				mode: game.defaultMode,
				maxPlayers: game.maxPlayers,
				roundMinutes: game.defaultRoundMinutes,
				teamSize: game.teamSize,
				formatType: null,
				formatConfig: {},
				pickedBy: comp.currentPickerId,
				pickRound
			})
			.returning({ id: schema.competitionGames.id })
			.get();

		tx.update(schema.competitions)
			.set({ currentPickerId: null })
			.where(eq(schema.competitions.id, competitionId))
			.run();

		return cg.id;
	});
}
