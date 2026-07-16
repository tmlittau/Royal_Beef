import { CONTROLLERS_DIR } from '$lib/server/picking';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const file = params.file;
	const m = /^[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp|svg)$/i.exec(file);
	if (!m || file.includes('..')) throw error(400, 'Bad file name');

	try {
		const buf = await readFile(`${CONTROLLERS_DIR}/${file}`);
		setHeaders({
			'content-type': TYPES[m[1].toLowerCase()] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=86400'
		});
		return new Response(new Uint8Array(buf));
	} catch {
		throw error(404, 'Controller image not found');
	}
};
