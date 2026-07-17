import { deleteCompetition, listCompetitions } from '$lib/server/competitions';
import { db, schema } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const games = db.select({ count: sql<number>`count(*)` }).from(schema.games).get();
	const competitions = listCompetitions();

	return {
		gameCount: games?.count ?? 0,
		competitions
	};
};

export const actions: Actions = {
	deleteCompetition: async ({ request }) => {
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id) || !deleteCompetition(id)) {
			return fail(400, { error: 'Could not delete that competition.' });
		}
		throw redirect(303, '/');
	}
};
