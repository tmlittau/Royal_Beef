import { db, schema } from '$lib/server/db';
import { getControllerSelection, pickController } from '$lib/server/picking';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

function statusOf(id: number) {
	return db
		.select({ status: schema.competitions.status })
		.from(schema.competitions)
		.where(eq(schema.competitions.id, id))
		.get()?.status;
}

export const load: PageServerLoad = ({ params }) => {
	const id = Number(params.id);
	const comp = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, id))
		.get();
	if (!comp) throw error(404, 'Competition not found');
	if (comp.status !== 'controllers') throw redirect(303, `/competition/${id}`);

	return { competitionId: id, competitionName: comp.name, selection: getControllerSelection(id) };
};

export const actions: Actions = {
	pick: async ({ params, request }) => {
		const id = Number(params.id);
		const raw = (await request.formData()).get('controllerId');
		const controllerId = raw ? Number(raw) : null;

		pickController(id, Number.isInteger(controllerId) ? controllerId : null);

		if (statusOf(id) !== 'controllers') throw redirect(303, `/competition/${id}`);
		throw redirect(303, `/competition/${id}/controllers`);
	}
};
