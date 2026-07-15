import type { CompetitionFormInitial } from '$lib/competition';
import { z } from 'zod';

const schema = z.object({
	name: z.string().trim().min(1, 'Give the competition a name').max(120),
	timeBudgetMinutes: z.number().int().min(5).max(240),
	competitorNames: z
		.array(z.string().trim().min(1).max(40))
		.min(2, 'Add at least 2 competitors')
		.max(32),
	gameIds: z.array(z.number().int().positive()).min(1, 'Pick at least one game')
});

export type CompetitionFormValues = z.infer<typeof schema>;

export type ParseResult =
	| { success: true; data: CompetitionFormValues }
	| { success: false; errors: Record<string, string>; values: CompetitionFormInitial };

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

function parseJsonArray(raw: string): unknown[] {
	try {
		const v = JSON.parse(raw || '[]');
		return Array.isArray(v) ? v : [];
	} catch {
		return [];
	}
}

export function parseCompetitionForm(form: FormData): ParseResult {
	const competitorNames = parseJsonArray(str(form.get('competitorNames')))
		.map((v) => (typeof v === 'string' ? v.trim() : ''))
		.filter((v) => v.length > 0);

	const gameIds = parseJsonArray(str(form.get('gameIds')))
		.map((v) => Number(v))
		.filter((v) => Number.isInteger(v) && v > 0);

	const raw = {
		name: str(form.get('name')).trim(),
		timeBudgetMinutes: Number(str(form.get('timeBudgetMinutes'))),
		competitorNames,
		gameIds
	};

	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		const errors: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0];
			if (typeof key === 'string' && !errors[key]) errors[key] = issue.message;
		}
		return {
			success: false,
			errors,
			values: {
				name: raw.name,
				timeBudgetMinutes: Number.isFinite(raw.timeBudgetMinutes)
					? raw.timeBudgetMinutes
					: undefined,
				competitorNames: raw.competitorNames,
				gameIds: raw.gameIds
			}
		};
	}

	return { success: true, data: parsed.data };
}
