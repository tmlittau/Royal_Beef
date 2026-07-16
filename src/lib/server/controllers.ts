import { asc, eq, sql } from 'drizzle-orm';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { db, schema } from './db';
import { CONTROLLERS_DIR } from './picking';

const EXT = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
const MIME_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/svg+xml': 'svg'
};
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB per image

export type ControllerRow = {
	id: number;
	image: string;
	label: string;
	quantity: number;
	sortIndex: number;
	usedCount: number; // competitors (across all competitions) currently holding this controller
};

/** Inventory list with a per-controller "in use" count (guards deletion). */
export function listControllers(): ControllerRow[] {
	return db
		.select({
			id: schema.controllers.id,
			image: schema.controllers.image,
			label: schema.controllers.label,
			quantity: schema.controllers.quantity,
			sortIndex: schema.controllers.sortIndex,
			usedCount: sql<number>`count(${schema.competitors.id})`
		})
		.from(schema.controllers)
		.leftJoin(schema.competitors, eq(schema.competitors.controllerId, schema.controllers.id))
		.groupBy(schema.controllers.id)
		.orderBy(asc(schema.controllers.sortIndex), asc(schema.controllers.id))
		.all();
}

/** "8bitdo-ultimate-red.png" → "8bitdo Ultimate Red" (mirrors the seed). */
export function prettyLabel(file: string): string {
	return (
		file
			.replace(/\.[^.]+$/, '')
			.split(/[-_]/)
			.filter(Boolean)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ') || 'Controller'
	);
}

function sanitizeBase(name: string): string {
	return (
		name
			.replace(/\.[^.]+$/, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'controller'
	);
}

/** Resolve a safe extension from the filename, falling back to the MIME type. */
function extOf(name: string, type: string): string | null {
	const dot = name.lastIndexOf('.');
	const raw = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
	if (EXT.includes(raw)) return raw;
	const fromMime = MIME_EXT[type];
	return fromMime && EXT.includes(fromMime) ? fromMime : null;
}

function uniqueName(base: string, ext: string, taken: Set<string>): string {
	let name = `${base}.${ext}`;
	let n = 1;
	while (taken.has(name)) name = `${base}-${n++}.${ext}`;
	return name;
}

export type UploadResult = { added: number; errors: string[] };

/** Validate + store uploaded images and add one inventory row per file (quantity 1). */
export async function addControllerImages(files: File[]): Promise<UploadResult> {
	const errors: string[] = [];
	const real = files.filter((f) => f && f.size > 0);
	if (real.length === 0) return { added: 0, errors: ['No image selected.'] };

	await mkdir(CONTROLLERS_DIR, { recursive: true });
	const taken = new Set(
		db.select({ image: schema.controllers.image }).from(schema.controllers).all().map((r) => r.image)
	);
	let sort =
		db
			.select({ m: sql<number>`coalesce(max(${schema.controllers.sortIndex}), -1)` })
			.from(schema.controllers)
			.get()?.m ?? -1;
	let added = 0;

	for (const file of real) {
		if (file.size > MAX_UPLOAD_BYTES) {
			errors.push(`${file.name}: too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
			continue;
		}
		const ext = extOf(file.name, file.type);
		if (!ext) {
			errors.push(`${file.name}: not a PNG, JPG, WebP or SVG image.`);
			continue;
		}
		const name = uniqueName(sanitizeBase(file.name), ext, taken);
		try {
			await writeFile(`${CONTROLLERS_DIR}/${name}`, new Uint8Array(await file.arrayBuffer()));
		} catch {
			errors.push(`${file.name}: could not be saved to disk.`);
			continue;
		}
		taken.add(name);
		db.insert(schema.controllers)
			.values({ image: name, label: prettyLabel(name), quantity: 1, sortIndex: ++sort })
			.run();
		added++;
	}
	return { added, errors };
}

/** Rename / set how many of this controller you own. */
export function updateController(id: number, label: string, quantity: number): void {
	const q = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
	const l = label.trim().slice(0, 60) || 'Controller';
	db.update(schema.controllers)
		.set({ label: l, quantity: q })
		.where(eq(schema.controllers.id, id))
		.run();
}

export type DeleteResult = { ok: boolean; reason?: string };

/** Remove a controller + its image file — blocked while any competition still references it. */
export async function deleteController(id: number): Promise<DeleteResult> {
	const row = db.select().from(schema.controllers).where(eq(schema.controllers.id, id)).get();
	if (!row) return { ok: false, reason: 'Controller not found.' };
	const used =
		db
			.select({ n: sql<number>`count(*)` })
			.from(schema.competitors)
			.where(eq(schema.competitors.controllerId, id))
			.get()?.n ?? 0;
	if (used > 0) return { ok: false, reason: `“${row.label}” was used in a competition — it can’t be removed.` };

	db.delete(schema.controllers).where(eq(schema.controllers.id, id)).run();
	try {
		await unlink(`${CONTROLLERS_DIR}/${row.image}`);
	} catch {
		// File already gone — the removed DB row is what matters.
	}
	return { ok: true };
}
