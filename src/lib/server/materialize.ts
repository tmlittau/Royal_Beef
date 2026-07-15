import type { DisplayMatch } from '$lib/format/display';
import type { FormatPlan, MatchSlot } from '$lib/format/types';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from './db';

function slotRef(s: MatchSlot): string | null {
	switch (s.kind) {
		case 'competitor':
			return null;
		case 'winner':
			return `winner:${s.ref}`;
		case 'loser':
			return `loser:${s.ref}`;
		case 'heatPlace':
			return `heat:${s.ref}#${s.place}`;
		case 'bye':
			return 'bye';
	}
}

/** Persist a plan into matches + match_participants, and mark the game active. */
export function materializeFormat(cgId: number, plan: FormatPlan): void {
	db.transaction((tx) => {
		// Clear any prior materialization (re-confirm). Cascades to participants.
		tx.delete(schema.matches).where(eq(schema.matches.competitionGameId, cgId)).run();

		plan.matches.forEach((m, i) => {
			const row = tx
				.insert(schema.matches)
				.values({
					competitionGameId: cgId,
					roundIndex: m.round,
					groupIndex: m.group ?? null,
					bracketSlot: m.ref,
					label: m.label,
					kind: m.kind,
					bestOf: m.bestOf,
					orderIndex: i,
					status: 'pending'
				})
				.returning({ id: schema.matches.id })
				.get();

			for (const s of m.slots) {
				tx.insert(schema.matchParticipants)
					.values({
						matchId: row.id,
						competitorId: s.kind === 'competitor' ? s.competitorId : null,
						teamIndex: s.kind === 'competitor' ? (s.team ?? null) : null,
						sourceRef: slotRef(s)
					})
					.run();
			}
		});

		tx.update(schema.competitionGames)
			.set({
				formatType: plan.formatType,
				formatConfig: plan.config,
				estimatedMinutes: plan.estimateMinutes,
				status: 'active'
			})
			.where(eq(schema.competitionGames.id, cgId))
			.run();
	});
}

/** Undo materialization — back to a pending game with no format. */
export function resetFormat(cgId: number): void {
	db.transaction((tx) => {
		tx.delete(schema.matches).where(eq(schema.matches.competitionGameId, cgId)).run();
		tx.update(schema.competitionGames)
			.set({ formatType: null, formatConfig: {}, estimatedMinutes: null, status: 'pending' })
			.where(eq(schema.competitionGames.id, cgId))
			.run();
	});
}

export function refToText(sourceRef: string | null, refLabel: Map<string, string>): string {
	if (!sourceRef) return '?';
	if (sourceRef === 'bye') return 'bye';
	const idx = sourceRef.indexOf(':');
	const kind = sourceRef.slice(0, idx);
	const rest = sourceRef.slice(idx + 1);
	if (kind === 'heat') {
		const [ref, place] = rest.split('#');
		return `${refLabel.get(ref) ?? ref} #${place}`;
	}
	return `${kind === 'winner' ? 'Winner' : 'Loser'} · ${refLabel.get(rest) ?? rest}`;
}

/** Read materialized matches back as display rows (for the "already set up" view). */
export function getMaterializedDisplay(cgId: number): DisplayMatch[] {
	const matchRows = db
		.select()
		.from(schema.matches)
		.where(eq(schema.matches.competitionGameId, cgId))
		.orderBy(asc(schema.matches.orderIndex))
		.all();
	if (matchRows.length === 0) return [];

	const refLabel = new Map(matchRows.map((m) => [m.bracketSlot ?? '', m.label ?? '']));

	const parts = db
		.select({
			matchId: schema.matchParticipants.matchId,
			teamIndex: schema.matchParticipants.teamIndex,
			sourceRef: schema.matchParticipants.sourceRef,
			name: schema.competitors.name
		})
		.from(schema.matchParticipants)
		.innerJoin(schema.matches, eq(schema.matches.id, schema.matchParticipants.matchId))
		.leftJoin(schema.competitors, eq(schema.competitors.id, schema.matchParticipants.competitorId))
		.where(eq(schema.matches.competitionGameId, cgId))
		.all();

	const byMatch = new Map<number, string[]>();
	for (const p of parts) {
		const label = p.name
			? p.teamIndex === null
				? p.name
				: `${p.name} (${String.fromCharCode(65 + p.teamIndex)})`
			: refToText(p.sourceRef, refLabel);
		const arr = byMatch.get(p.matchId) ?? [];
		arr.push(label);
		byMatch.set(p.matchId, arr);
	}

	return matchRows.map((m) => ({
		round: m.roundIndex,
		group: m.groupIndex ?? undefined,
		label: m.label ?? '',
		kind: '',
		parts: byMatch.get(m.id) ?? []
	}));
}
