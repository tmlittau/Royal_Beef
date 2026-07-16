import { createCompetition } from '$lib/server/competitions';
import { parseCompetitionForm } from '$lib/server/competitionForm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const suggestedName = `Game Night · ${new Date().toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	})}`;
	return { suggestedName };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const result = parseCompetitionForm(form);
		if (!result.success) {
			return fail(400, { errors: result.errors, values: result.values });
		}

		const id = createCompetition(result.data);
		throw redirect(303, `/competition/${id}/controllers`);
	}
};
