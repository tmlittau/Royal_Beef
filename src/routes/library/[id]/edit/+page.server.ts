import { db, schema } from '$lib/server/db';
import { parseGameForm } from '$lib/server/gameForm';
import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
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
		db.delete(schema.games).where(eq(schema.games.id, id)).run();
		throw redirect(303, '/library');
	}
};
