import { COVERS_DIR } from '$lib/server/steam';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import type { RequestHandler } from './$types';

// Serves locally-cached Steam cover art from the data volume.
export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const file = params.file;
	if (!/^steam_\d+\.jpg$/.test(file)) throw error(400, 'Bad file name');

	try {
		const buf = await readFile(`${COVERS_DIR}/${file}`);
		setHeaders({
			'content-type': 'image/jpeg',
			'cache-control': 'public, max-age=31536000, immutable'
		});
		return new Response(new Uint8Array(buf));
	} catch {
		throw error(404, 'Cover not found');
	}
};
