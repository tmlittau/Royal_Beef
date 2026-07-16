import { endCompetitionEarly, getCompetitionOverview } from '$lib/server/competitions';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const overview = getCompetitionOverview(Number(params.id));
	if (!overview) throw error(404, 'Competition not found');
	return overview;
};

export const actions: Actions = {
	finishEarly: async ({ params }) => {
		const id = Number(params.id);
		if (!endCompetitionEarly(id)) return fail(400, { error: 'This competition is not running.' });
		throw redirect(303, `/competition/${id}/results`);
	}
};
