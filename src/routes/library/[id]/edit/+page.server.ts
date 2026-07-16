import { db, schema } from '$lib/server/db';
import { parseGameForm } from '$lib/server/gameForm';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const game = db.select().from(schema.games).where(eq(schema.games.id, id)).get();
	if (!game) throw error(404, 'Game not found');
	return { game };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		const form = await request.formData();
		const result = parseGameForm(form);
		if (!result.success) {
			return fail(400, { errors: result.errors, values: result.values });
		}

		const d = result.data;
		db.update(schema.games)
			.set({
				name: d.name,
				description: d.description,
				coverUrl: d.coverUrl || null,
				minPlayers: d.minPlayers,
				maxPlayers: d.maxPlayers,
				defaultRoundMinutes: d.defaultRoundMinutes,
				supportedModes: d.supportedModes,
				defaultMode: d.defaultMode,
				teamSize: d.teamSize,
				scoringType: d.scoringType,
				statDefinitions: d.statDefinitions,
				notes: d.notes
			})
			.where(eq(schema.games.id, id))
			.run();

		throw redirect(303, '/library');
	},

	delete: async ({ params }) => {
		const id = Number(params.id);
		// A game used in a competition is referenced by competition_games (FK). Deleting it
		// would throw (foreign_keys=ON) and erase the name from past results — block it instead.
		const used =
			db
				.select({ n: sql<number>`count(*)` })
				.from(schema.competitionGames)
				.where(eq(schema.competitionGames.gameId, id))
				.get()?.n ?? 0;
		if (used > 0) {
			return fail(400, {
				deleteError:
					"This game has been used in a competition, so it can't be deleted (that would break past results). You can edit it instead."
			});
		}
		db.delete(schema.games).where(eq(schema.games.id, id)).run();
		throw redirect(303, '/library');
	}
};
