import { getSteamApp } from '$lib/server/steam';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const appId = Number(params.appId);
	if (!Number.isInteger(appId) || appId <= 0) {
		return json({ error: 'Invalid app id' }, { status: 400 });
	}

	try {
		const details = await getSteamApp(appId);
		return json(details);
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : 'Fetch failed' }, { status: 502 });
	}
};
