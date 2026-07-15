import type { SteamAppDetails, SteamSearchItem } from '$lib/steam';
import { eq } from 'drizzle-orm';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { db, schema } from './db';

const SEARCH_TTL_S = 60 * 60 * 24; // 1 day
const APP_TTL_S = 60 * 60 * 24 * 30; // 30 days

/** Where downloaded cover art lives. On the Docker volume in production. */
export const COVERS_DIR = process.env.COVERS_DIR ?? 'data/covers';

const nowS = () => Math.floor(Date.now() / 1000);
const ageS = (d: Date) => nowS() - Math.floor(d.getTime() / 1000);

/** Search the Steam store, cached in SQLite. */
export async function searchSteam(query: string): Promise<SteamSearchItem[]> {
	const q = query.trim().toLowerCase();
	if (q.length < 2) return [];

	const cached = db
		.select()
		.from(schema.steamSearchCache)
		.where(eq(schema.steamSearchCache.query, q))
		.get();
	if (cached && ageS(cached.fetchedAt) < SEARCH_TTL_S) return cached.results;

	const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&cc=us&l=en`;
	const res = await fetch(url, { headers: { accept: 'application/json' } });
	if (!res.ok) throw new Error(`Steam search failed (${res.status})`);
	const jsonUnknown = (await res.json()) as { items?: { type?: string; id: number; name: string; tiny_image?: string }[] };

	const items: SteamSearchItem[] = (jsonUnknown.items ?? [])
		.filter((i) => i.type === 'app')
		.map((i) => ({ appId: i.id, name: i.name, thumb: i.tiny_image ?? null }));

	db.insert(schema.steamSearchCache)
		.values({ query: q, results: items })
		.onConflictDoUpdate({
			target: schema.steamSearchCache.query,
			set: { results: items, fetchedAt: new Date() }
		})
		.run();

	return items;
}

/** Fetch normalized details for one app, cached in SQLite, with cover downloaded locally. */
export async function getSteamApp(appId: number): Promise<SteamAppDetails> {
	const cached = db
		.select()
		.from(schema.steamAppCache)
		.where(eq(schema.steamAppCache.appId, appId))
		.get();
	if (cached && ageS(cached.fetchedAt) < APP_TTL_S) {
		return ensureCover(cached.data);
	}

	const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en&filters=basic,categories,genres`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Steam app fetch failed (${res.status})`);
	const parsed = (await res.json()) as Record<
		string,
		{ success: boolean; data?: SteamRawApp }
	>;
	const entry = parsed[String(appId)];
	if (!entry?.success || !entry.data) throw new Error('Game not found on Steam');

	const d = entry.data;
	const categories = (d.categories ?? []).map((c) => c.description);
	const details: SteamAppDetails = {
		appId,
		name: d.name,
		description: d.short_description ?? null,
		headerImage: d.header_image ?? null,
		coverUrl: null,
		genres: (d.genres ?? []).map((g) => g.description),
		categories,
		localMultiplayer: categories.some((c) => /shared\/split screen/i.test(c)),
		modeHints: deriveModeHints(categories)
	};

	const withCover = await ensureCover(details);
	db.insert(schema.steamAppCache)
		.values({ appId, data: withCover })
		.onConflictDoUpdate({
			target: schema.steamAppCache.appId,
			set: { data: withCover, fetchedAt: new Date() }
		})
		.run();

	return withCover;
}

type SteamRawApp = {
	name: string;
	short_description?: string;
	header_image?: string;
	categories?: { id: number; description: string }[];
	genres?: { id: string; description: string }[];
};

/** Download the header image to COVERS_DIR (once) and point coverUrl at the local copy. */
async function ensureCover(d: SteamAppDetails): Promise<SteamAppDetails> {
	if (!d.headerImage) return d;
	const file = `steam_${d.appId}.jpg`;
	const path = `${COVERS_DIR}/${file}`;
	const localUrl = `/covers/${file}`;

	try {
		await access(path);
		return { ...d, coverUrl: localUrl };
	} catch {
		// not downloaded yet
	}

	try {
		const res = await fetch(d.headerImage);
		if (!res.ok) return { ...d, coverUrl: d.headerImage };
		const buf = Buffer.from(await res.arrayBuffer());
		await mkdir(COVERS_DIR, { recursive: true });
		await writeFile(path, buf);
		return { ...d, coverUrl: localUrl };
	} catch {
		// network hiccup — fall back to the remote URL so the cover still shows online
		return { ...d, coverUrl: d.headerImage };
	}
}

/** Map Steam category descriptions to our game modes (a hint, not a verdict). */
function deriveModeHints(categories: string[]): string[] {
	const has = (re: RegExp) => categories.some((c) => re.test(c));
	const hints = new Set<string>();
	if (has(/co-?op/i)) hints.add('coop_score');
	if (has(/pvp/i)) hints.add('ffa');
	if (hints.size === 0 && has(/multi-?player/i)) hints.add('ffa');
	if (hints.size === 0) hints.add('ffa');
	return [...hints];
}
