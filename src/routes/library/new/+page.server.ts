import { db, schema } from '$lib/server/db';
import { parseGameForm } from '$lib/server/gameForm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const result = parseGameForm(form);
		if (!result.success) {
			return fail(400, { errors: result.errors, values: result.values });
		}

		const d = result.data;
		db.insert(schema.games)
			.values({
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
			.run();

		throw redirect(303, '/library');
	}
};
