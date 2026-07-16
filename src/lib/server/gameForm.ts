import { MODES, slugifyKey, type GameFormInitial, type GameMode, type StatRow } from '$lib/games';
import { z } from 'zod';

// Derive the valid modes from the shared MODES list so this never drifts out of sync
// when a new mode is added (e.g. one_vs_all).
const modeEnum = z.enum(MODES.map((m) => m.value) as [GameMode, ...GameMode[]]);

const statDefSchema = z.object({
	label: z.string().trim().min(1),
	type: z.enum(['number', 'time', 'count']),
	aggregate: z.enum(['sum', 'max', 'min', 'avg']),
	higherIsBetter: z.boolean()
});

const gameSchema = z
	.object({
		name: z.string().trim().min(1, 'Name is required').max(120),
		description: z.string().trim().max(500).nullable(),
		coverUrl: z
			.string()
			.trim()
			.refine(
				(v) => v === '' || /^https?:\/\//.test(v) || /^\/covers\/steam_\d+\.jpg$/.test(v),
				{ message: 'Must be an image URL or a Steam-imported cover' }
			)
			.nullable(),
		minPlayers: z.number().int().min(1).max(64),
		maxPlayers: z.number().int().min(1).max(64),
		defaultRoundMinutes: z.number().int().min(1).max(240),
		supportedModes: z.array(modeEnum).min(1, 'Pick at least one mode'),
		defaultMode: modeEnum,
		teamSize: z.number().int().min(2).max(16).nullable(),
		scoringType: z.enum(['placement', 'score', 'time']),
		notes: z.string().trim().max(500).nullable(),
		statDefinitions: z.array(statDefSchema).max(12)
	})
	.refine((d) => d.maxPlayers >= d.minPlayers, {
		message: 'Max players must be ≥ min players',
		path: ['maxPlayers']
	})
	.refine((d) => d.supportedModes.includes(d.defaultMode), {
		message: 'Default mode must be one of the supported modes',
		path: ['defaultMode']
	})
	.refine((d) => !d.supportedModes.includes('teams') || (d.teamSize ?? 0) >= 2, {
		message: 'Set a team size (≥ 2) when Teams mode is supported',
		path: ['teamSize']
	});

export type GameFormValues = z.infer<typeof gameSchema>;

export type ParseResult =
	| { success: true; data: GameFormValues & { statDefinitions: (GameFormValues['statDefinitions'][number] & { key: string })[] } }
	| { success: false; errors: Record<string, string>; values: GameFormInitial };

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');
const emptyToNull = (v: string) => (v.trim() === '' ? null : v.trim());
const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export function parseGameForm(form: FormData): ParseResult {
	let statDefinitions: unknown = [];
	try {
		statDefinitions = JSON.parse(str(form.get('statDefinitions')) || '[]');
	} catch {
		statDefinitions = [];
	}

	const raw = {
		name: str(form.get('name')),
		description: emptyToNull(str(form.get('description'))),
		coverUrl: emptyToNull(str(form.get('coverUrl'))),
		minPlayers: Number(str(form.get('minPlayers'))),
		maxPlayers: Number(str(form.get('maxPlayers'))),
		defaultRoundMinutes: Number(str(form.get('defaultRoundMinutes'))),
		supportedModes: form.getAll('supportedModes').map(String),
		defaultMode: str(form.get('defaultMode')),
		teamSize: numOrNull(str(form.get('teamSize'))),
		scoringType: str(form.get('scoringType')),
		notes: emptyToNull(str(form.get('notes'))),
		statDefinitions
	};

	const parsed = gameSchema.safeParse(raw);
	if (!parsed.success) {
		const errors: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0];
			if (typeof key === 'string' && !errors[key]) errors[key] = issue.message;
		}
		const values: GameFormInitial = {
			name: raw.name,
			description: raw.description,
			coverUrl: raw.coverUrl,
			minPlayers: Number.isFinite(raw.minPlayers) ? raw.minPlayers : undefined,
			maxPlayers: Number.isFinite(raw.maxPlayers) ? raw.maxPlayers : undefined,
			defaultRoundMinutes: Number.isFinite(raw.defaultRoundMinutes)
				? raw.defaultRoundMinutes
				: undefined,
			supportedModes: raw.supportedModes,
			defaultMode: raw.defaultMode,
			teamSize: raw.teamSize,
			scoringType: raw.scoringType,
			notes: raw.notes,
			statDefinitions: Array.isArray(statDefinitions) ? (statDefinitions as StatRow[]) : []
		};
		return { success: false, errors, values };
	}

	// Derive stable, de-duplicated keys from labels.
	const seen = new Map<string, number>();
	const withKeys = parsed.data.statDefinitions.map((s) => {
		let key = slugifyKey(s.label) || 'stat';
		const n = seen.get(key) ?? 0;
		seen.set(key, n + 1);
		if (n > 0) key = `${key}_${n + 1}`;
		return { ...s, key };
	});

	return { success: true, data: { ...parsed.data, statDefinitions: withKeys } };
}
