import { createCompetition } from '$lib/server/competitions';
import { parseCompetitionForm } from '$lib/server/competitionForm';
import { db, schema } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const games = db.select().from(schema.games).orderBy(asc(schema.games.name)).all();
	const suggestedName = `Game Night · ${new Date().toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	})}`;
	return { games, suggestedName };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const result = parseCompetitionForm(form);
		if (!result.success) {
			return fail(400, { errors: result.errors, values: result.values });
		}

		const id = createCompetition(result.data);
		throw redirect(303, `/competition/${id}`);
	}
};
