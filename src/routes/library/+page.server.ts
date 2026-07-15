import { db, schema } from '$lib/server/db';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const games = db.select().from(schema.games).orderBy(asc(schema.games.name)).all();
	return { games };
};
