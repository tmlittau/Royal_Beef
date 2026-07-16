import { db, schema } from '$lib/server/db';
import { getFinalResults } from '$lib/server/finalResults';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const competition = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, id))
		.get();
	if (!competition) throw error(404, 'Competition not found');
	if (competition.status !== 'finished') throw redirect(303, `/competition/${id}`);

	return { competition, results: getFinalResults(id) };
};
