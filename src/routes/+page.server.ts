import { listCompetitions } from '$lib/server/competitions';
import { db, schema } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const games = db.select({ count: sql<number>`count(*)` }).from(schema.games).get();
	const competitions = listCompetitions();

	return {
		gameCount: games?.count ?? 0,
		competitions
	};
};
