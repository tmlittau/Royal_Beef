import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { SteamAppDetails, SteamSearchItem } from '$lib/steam';

/** A single game-specific stat the players report during a match. */
export type StatDef = {
	key: string;
	label: string;
	type: 'number' | 'time' | 'count';
	aggregate: 'sum' | 'max' | 'min' | 'avg';
	higherIsBetter: boolean;
};

/* ---------------------------------------------------------------- *
 * Library
 * ---------------------------------------------------------------- */
export const games = sqliteTable('games', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	steamAppId: integer('steam_app_id'),
	coverUrl: text('cover_url'),
	description: text('description'),
	minPlayers: integer('min_players').notNull().default(2),
	maxPlayers: integer('max_players').notNull().default(4),
	defaultRoundMinutes: integer('default_round_minutes').notNull().default(5),
	supportedModes: text('supported_modes', { mode: 'json' })
		.$type<string[]>()
		.notNull()
		.default(sql`'["ffa"]'`),
	defaultMode: text('default_mode').notNull().default('ffa'),
	teamSize: integer('team_size'),
	scoringType: text('scoring_type', { enum: ['placement', 'score', 'time'] })
		.notNull()
		.default('placement'),
	statDefinitions: text('stat_definitions', { mode: 'json' })
		.$type<StatDef[]>()
		.notNull()
		.default(sql`'[]'`),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/* ---------------------------------------------------------------- *
 * Competition (an event / session)
 * ---------------------------------------------------------------- */
export const competitions = sqliteTable('competitions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	status: text('status', { enum: ['setup', 'active', 'finished'] })
		.notNull()
		.default('setup'),
	pointsScheme: text('points_scheme', { mode: 'json' })
		.$type<number[]>()
		.notNull()
		.default(sql`'[3,2,1]'`),
	timeBudgetMinutes: integer('time_budget_minutes').notNull().default(30),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	finishedAt: integer('finished_at', { mode: 'timestamp' })
});

export const competitors = sqliteTable('competitors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	competitionId: integer('competition_id')
		.notNull()
		.references(() => competitions.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	color: text('color').notNull().default('#ff6a2b'),
	seed: integer('seed')
});

/* ---------------------------------------------------------------- *
 * A library game as played inside a competition (a "round")
 * ---------------------------------------------------------------- */
export const competitionGames = sqliteTable('competition_games', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	competitionId: integer('competition_id')
		.notNull()
		.references(() => competitions.id, { onDelete: 'cascade' }),
	gameId: integer('game_id')
		.notNull()
		.references(() => games.id),
	orderIndex: integer('order_index').notNull().default(0),
	status: text('status', { enum: ['pending', 'active', 'finished'] })
		.notNull()
		.default('pending'),
	mode: text('mode').notNull().default('ffa'),
	maxPlayers: integer('max_players').notNull(),
	roundMinutes: integer('round_minutes').notNull(),
	teamSize: integer('team_size'),
	// Null until the format engine (Phase 4) decides how this game is played.
	formatType: text('format_type', {
		enum: [
			'single_match',
			'round_robin',
			'single_elimination',
			'double_elimination',
			'heats_final',
			'team_match',
			'coop_score'
		]
	}),
	formatConfig: text('format_config', { mode: 'json' })
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'`),
	estimatedMinutes: integer('estimated_minutes'),
	finishedAt: integer('finished_at', { mode: 'timestamp' })
});

/* ---------------------------------------------------------------- *
 * Matches within a format, and their participants
 * ---------------------------------------------------------------- */
export const matches = sqliteTable('matches', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	competitionGameId: integer('competition_game_id')
		.notNull()
		.references(() => competitionGames.id, { onDelete: 'cascade' }),
	roundIndex: integer('round_index').notNull().default(0),
	groupIndex: integer('group_index'),
	bracketSlot: text('bracket_slot'),
	label: text('label'),
	kind: text('kind'), // ffa | duel | team | heat | final | score (from the engine)
	bestOf: integer('best_of').notNull().default(1),
	status: text('status', { enum: ['pending', 'active', 'finished'] })
		.notNull()
		.default('pending'),
	feedsFrom: text('feeds_from', { mode: 'json' })
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'`),
	orderIndex: integer('order_index').notNull().default(0)
});

export const matchParticipants = sqliteTable('match_participants', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	matchId: integer('match_id')
		.notNull()
		.references(() => matches.id, { onDelete: 'cascade' }),
	competitorId: integer('competitor_id').references(() => competitors.id, {
		onDelete: 'cascade'
	}),
	teamIndex: integer('team_index'),
	placement: integer('placement'),
	rawScore: real('raw_score'),
	isWinner: integer('is_winner', { mode: 'boolean' }).notNull().default(false),
	sourceRef: text('source_ref')
});

/* ---------------------------------------------------------------- *
 * Final per-game standings (3/2/1 or team rule applied)
 * ---------------------------------------------------------------- */
export const gameResults = sqliteTable('game_results', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	competitionGameId: integer('competition_game_id')
		.notNull()
		.references(() => competitionGames.id, { onDelete: 'cascade' }),
	competitorId: integer('competitor_id')
		.notNull()
		.references(() => competitors.id, { onDelete: 'cascade' }),
	finalRank: integer('final_rank').notNull(),
	competitionPoints: integer('competition_points').notNull().default(0)
});

/* ---------------------------------------------------------------- *
 * Game-specific stat values reported by players
 * ---------------------------------------------------------------- */
export const statEntries = sqliteTable('stat_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	competitionGameId: integer('competition_game_id')
		.notNull()
		.references(() => competitionGames.id, { onDelete: 'cascade' }),
	matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }),
	competitorId: integer('competitor_id')
		.notNull()
		.references(() => competitors.id, { onDelete: 'cascade' }),
	statKey: text('stat_key').notNull(),
	valueNum: real('value_num'),
	valueText: text('value_text')
});

/* ---------------------------------------------------------------- *
 * Steam API response cache (politeness + offline at the couch)
 * ---------------------------------------------------------------- */
export const steamSearchCache = sqliteTable('steam_search_cache', {
	query: text('query').primaryKey(),
	results: text('results', { mode: 'json' }).$type<SteamSearchItem[]>().notNull(),
	fetchedAt: integer('fetched_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const steamAppCache = sqliteTable('steam_app_cache', {
	appId: integer('app_id').primaryKey(),
	data: text('data', { mode: 'json' }).$type<SteamAppDetails>().notNull(),
	fetchedAt: integer('fetched_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

/* ---------------------------------------------------------------- *
 * Inferred types for use across the app
 * ---------------------------------------------------------------- */
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Competition = typeof competitions.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type CompetitionGame = typeof competitionGames.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type GameResult = typeof gameResults.$inferSelect;
export type StatEntry = typeof statEntries.$inferSelect;
