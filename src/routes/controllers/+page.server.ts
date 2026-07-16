import {
	addControllerImages,
	deleteController,
	listControllers,
	updateController
} from '$lib/server/controllers';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ controllers: listControllers() });

export const actions: Actions = {
	upload: async ({ request }) => {
		const form = await request.formData();
		const files = form.getAll('images').filter((f): f is File => f instanceof File);
		const res = await addControllerImages(files);
		if (res.added === 0) return fail(400, { error: res.errors.join(' ') || 'Nothing uploaded.' });
		return { added: res.added, warning: res.errors.join(' ') || null };
	},

	update: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Bad controller id.' });
		updateController(id, String(form.get('label') ?? ''), Number(form.get('quantity') ?? 1));
		return { updated: true };
	},

	delete: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Bad controller id.' });
		const res = await deleteController(id);
		if (!res.ok) return fail(400, { error: res.reason });
		return { deleted: true };
	}
};
