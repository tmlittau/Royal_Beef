import { db, schema } from '$lib/server/db';
import { getPickState, getPickableGames, pickGame } from '$lib/server/picking';
import { error, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const comp = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, id))
		.get();
	if (!comp) throw error(404, 'Competition not found');
	if (comp.status === 'controllers') throw redirect(303, `/competition/${id}/controllers`);
	if (comp.status !== 'active' || comp.currentPickerId == null) {
		throw redirect(303, `/competition/${id}`);
	}

	const competitors = db
		.select()
		.from(schema.competitors)
		.where(eq(schema.competitors.competitionId, id))
		.orderBy(asc(schema.competitors.id))
		.all();
	const games = getPickableGames(id);

	return { competitionId: id, competitionName: comp.name, pick: getPickState(id), competitors, games };
};

export const actions: Actions = {
	pick: async ({ params, request }) => {
		const id = Number(params.id);
		const gameId = Number((await request.formData()).get('gameId'));
		const cgId = Number.isInteger(gameId) ? pickGame(id, gameId) : null;
		if (cgId) throw redirect(303, `/competition/${id}/game/${cgId}`);
		throw redirect(303, `/competition/${id}`);
	}
};
