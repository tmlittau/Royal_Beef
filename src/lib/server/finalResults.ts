import type { StatDef } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from './db';

export type FinalStanding = {
	competitorId: number;
	name: string;
	color: string;
	points: number;
	firsts: number;
	podiums: number;
	rank: number;
};

export type Highlight = {
	key: string;
	label: string;
	name: string;
	color: string;
	value: string;
	sub?: string;
};

export type FinalResults = {
	standings: FinalStanding[];
	championIds: number[];
	highlights: Highlight[];
};

/** Champion (tiebroken by game wins), full standings, and interesting-stat highlights. */
export function getFinalResults(competitionId: number): FinalResults {
	const rows = db
		.select({
			competitorId: schema.competitors.id,
			name: schema.competitors.name,
			color: schema.competitors.color,
			points: sql<number>`coalesce(sum(${schema.gameResults.competitionPoints}), 0)`,
			firsts: sql<number>`coalesce(sum(case when ${schema.gameResults.finalRank} = 1 then 1 else 0 end), 0)`,
			podiums: sql<number>`coalesce(sum(case when ${schema.gameResults.finalRank} <= 3 then 1 else 0 end), 0)`
		})
		.from(schema.competitors)
		.leftJoin(schema.gameResults, eq(schema.gameResults.competitorId, schema.competitors.id))
		.where(eq(schema.competitors.competitionId, competitionId))
		.groupBy(schema.competitors.id)
		.all();

	rows.sort((a, b) => b.points - a.points || b.firsts - a.firsts || a.name.localeCompare(b.name));
	const standings: FinalStanding[] = rows.map((r, i) => ({ ...r, rank: i + 1 }));

	const top = standings[0];
	const championIds = top
		? standings
				.filter((s) => s.points === top.points && s.firsts === top.firsts)
				.map((s) => s.competitorId)
		: [];

	const highlights: Highlight[] = [];

	// Most game wins.
	const mostGolds = [...standings].sort((a, b) => b.firsts - a.firsts)[0];
	if (mostGolds && mostGolds.firsts > 0) {
		highlights.push({
			key: 'golds',
			label: 'Most game wins',
			name: mostGolds.name,
			color: mostGolds.color,
			value: `${mostGolds.firsts} 🥇`
		});
	}

	// Per-stat leaders.
	const gameDefs = db
		.select({ statDefinitions: schema.games.statDefinitions })
		.from(schema.competitionGames)
		.innerJoin(schema.games, eq(schema.games.id, schema.competitionGames.gameId))
		.where(eq(schema.competitionGames.competitionId, competitionId))
		.all();
	const statMeta = new Map<string, StatDef>();
	for (const g of gameDefs) for (const sd of g.statDefinitions) if (!statMeta.has(sd.key)) statMeta.set(sd.key, sd);

	const statRows = db
		.select({
			statKey: schema.statEntries.statKey,
			competitorId: schema.statEntries.competitorId,
			name: schema.competitors.name,
			color: schema.competitors.color,
			value: schema.statEntries.valueNum
		})
		.from(schema.statEntries)
		.innerJoin(schema.competitionGames, eq(schema.competitionGames.id, schema.statEntries.competitionGameId))
		.innerJoin(schema.competitors, eq(schema.competitors.id, schema.statEntries.competitorId))
		.where(eq(schema.competitionGames.competitionId, competitionId))
		.all();

	const perStat = new Map<string, Map<number, { name: string; color: string; values: number[] }>>();
	for (const r of statRows) {
		if (r.value == null) continue;
		const byComp = perStat.get(r.statKey) ?? new Map();
		perStat.set(r.statKey, byComp);
		const e = byComp.get(r.competitorId) ?? { name: r.name, color: r.color, values: [] };
		e.values.push(r.value);
		byComp.set(r.competitorId, e);
	}

	const aggregate = (vals: number[], how: StatDef['aggregate']) => {
		if (how === 'max') return Math.max(...vals);
		if (how === 'min') return Math.min(...vals);
		const sum = vals.reduce((a, b) => a + b, 0);
		return how === 'avg' ? sum / vals.length : sum;
	};
	const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

	for (const [key, byComp] of perStat) {
		const meta = statMeta.get(key);
		if (!meta) continue;
		let best: { name: string; color: string; v: number } | null = null;
		for (const [, e] of byComp) {
			const v = aggregate(e.values, meta.aggregate);
			if (!best || (meta.higherIsBetter ? v > best.v : v < best.v)) best = { name: e.name, color: e.color, v };
		}
		if (best) {
			highlights.push({
				key: `stat_${key}`,
				label: `${meta.higherIsBetter ? 'Most' : 'Fewest'} ${meta.label}`,
				name: best.name,
				color: best.color,
				value: fmt(best.v)
			});
		}
	}

	// Wooden spoon.
	if (standings.length > 1) {
		const last = standings[standings.length - 1];
		highlights.push({
			key: 'spoon',
			label: 'Wooden spoon',
			name: last.name,
			color: last.color,
			value: `${last.points} pts`,
			sub: '🥄 Better luck next time'
		});
	}

	return { standings, championIds, highlights };
}
