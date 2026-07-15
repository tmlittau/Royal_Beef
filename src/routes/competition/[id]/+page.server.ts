import { getCompetitionOverview } from '$lib/server/competitions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const overview = getCompetitionOverview(Number(params.id));
	if (!overview) throw error(404, 'Competition not found');
	return overview;
};
