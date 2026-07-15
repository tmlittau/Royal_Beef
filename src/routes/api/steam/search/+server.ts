import { searchSteam } from '$lib/server/steam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	if (q.trim().length < 2) return json({ items: [] });

	try {
		const items = await searchSteam(q);
		return json({ items });
	} catch (e) {
		return json(
			{ items: [], error: e instanceof Error ? e.message : 'Search failed' },
			{ status: 502 }
		);
	}
};
