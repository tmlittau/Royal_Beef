import { resolvePlan } from '$lib/format/display';
import { eligibleFormats, planFormat, selectFormat } from '$lib/format/engine';
import type { FormatContext, FormatType } from '$lib/format/types';
import type { GameMode, ScoringType } from '$lib/games';
import { db, schema } from '$lib/server/db';
import { getMaterializedDisplay, materializeFormat, resetFormat } from '$lib/server/materialize';
import { getGameResults, getRunnerState, saveMatchResult, type SaveEntry } from '$lib/server/results';
import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

function loadGame(cgId: number) {
	return db
		.select({
			id: schema.competitionGames.id,
			competitionId: schema.competitionGames.competitionId,
			status: schema.competitionGames.status,
			mode: schema.competitionGames.mode,
			maxPlayers: schema.competitionGames.maxPlayers,
			roundMinutes: schema.competitionGames.roundMinutes,
			teamSize: schema.competitionGames.teamSize,
			formatType: schema.competitionGames.formatType,
			estimatedMinutes: schema.competitionGames.estimatedMinutes,
			name: schema.games.name,
			coverUrl: schema.games.coverUrl,
			scoringType: schema.games.scoringType,
			statDefinitions: schema.games.statDefinitions
		})
		.from(schema.competitionGames)
		.innerJoin(schema.games, eq(schema.games.id, schema.competitionGames.gameId))
		.where(eq(schema.competitionGames.id, cgId))
		.get();
}

type GameRow = NonNullable<ReturnType<typeof loadGame>>;

const loadCompetitors = (competitionId: number) =>
	db
		.select()
		.from(schema.competitors)
		.where(eq(schema.competitors.competitionId, competitionId))
		.orderBy(asc(schema.competitors.id))
		.all();

function buildContext(cg: GameRow, competitorIds: number[], budget: number): FormatContext {
	return {
		competitorIds,
		maxPlayers: cg.maxPlayers,
		mode: cg.mode as GameMode,
		scoringType: cg.scoringType as ScoringType,
		roundMinutes: cg.roundMinutes,
		teamSize: cg.teamSize,
		timeBudgetMinutes: budget
	};
}

export const load: PageServerLoad = ({ params }) => {
	const cg = loadGame(Number(params.cgId));
	if (!cg) throw error(404, 'Game not found');

	const competition = db
		.select()
		.from(schema.competitions)
		.where(eq(schema.competitions.id, cg.competitionId))
		.get();
	const competitors = loadCompetitors(cg.competitionId);

	if (cg.status === 'finished') {
		return { view: 'finished' as const, cg, competition, results: getGameResults(cg.id) };
	}

	if (cg.status === 'active') {
		return {
			view: 'run' as const,
			cg,
			competition,
			statDefs: cg.statDefinitions,
			runner: getRunnerState(cg.id),
			materialized: getMaterializedDisplay(cg.id)
		};
	}

	// pending → format preview
	const ctx = buildContext(cg, competitors.map((c) => c.id), competition?.timeBudgetMinutes ?? 30);
	const names = new Map(competitors.map((c) => [c.id, c.name]));
	const auto = selectFormat(ctx);
	const plans = eligibleFormats(ctx).map((f) => {
		const plan = planFormat({ ...ctx, formatOverride: f });
		return {
			formatType: plan.formatType,
			estimateMinutes: plan.estimateMinutes,
			rationale: plan.rationale,
			matchCount: plan.matches.length,
			display: resolvePlan(plan, names)
		};
	});
	return { view: 'preview' as const, cg, competition, competitors, plans, auto };
};

export const actions: Actions = {
	confirm: async ({ params, request }) => {
		const cg = loadGame(Number(params.cgId));
		if (!cg) throw error(404, 'Game not found');
		const form = await request.formData();
		const formatType = String(form.get('formatType')) as FormatType;

		const competition = db
			.select()
			.from(schema.competitions)
			.where(eq(schema.competitions.id, cg.competitionId))
			.get();
		const competitors = loadCompetitors(cg.competitionId);
		const ctx = buildContext(cg, competitors.map((c) => c.id), competition?.timeBudgetMinutes ?? 30);

		if (!eligibleFormats(ctx).includes(formatType)) {
			return fail(400, { error: 'Invalid format for this game.' });
		}
		materializeFormat(cg.id, planFormat({ ...ctx, formatOverride: formatType }));
		throw redirect(303, `/competition/${cg.competitionId}/game/${cg.id}`);
	},

	reset: async ({ params }) => {
		const cg = loadGame(Number(params.cgId));
		if (!cg) throw error(404, 'Game not found');
		resetFormat(cg.id);
		throw redirect(303, `/competition/${cg.competitionId}/game/${cg.id}`);
	},

	saveMatch: async ({ params, request }) => {
		const cg = loadGame(Number(params.cgId));
		if (!cg) throw error(404, 'Game not found');
		const form = await request.formData();
		const matchId = Number(form.get('matchId'));

		let parsed: unknown;
		try {
			parsed = JSON.parse(String(form.get('entries') ?? '[]'));
		} catch {
			return fail(400, { error: 'Bad result payload.' });
		}
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return fail(400, { error: 'No results entered.' });
		}

		const entries: SaveEntry[] = parsed.map((e) => ({
			competitorId: Number((e as SaveEntry).competitorId),
			placement: Number((e as SaveEntry).placement),
			score: (e as SaveEntry).score == null ? null : Number((e as SaveEntry).score),
			stats: (e as SaveEntry).stats ?? {}
		}));

		if (entries.some((e) => !Number.isInteger(e.competitorId) || !Number.isInteger(e.placement))) {
			return fail(400, { error: 'Invalid result values.' });
		}

		saveMatchResult(matchId, entries);
		throw redirect(303, `/competition/${cg.competitionId}/game/${cg.id}`);
	}
};
