import type { GameMode, ScoringType } from '$lib/games';

export type FormatType =
	| 'single_match'
	| 'round_robin'
	| 'single_elimination'
	| 'double_elimination'
	| 'heats_final'
	| 'team_match'
	| 'coop_score'
	| 'one_vs_all';

/** A participant slot in a generated match. Concrete competitor, or a reference resolved from results. */
export type MatchSlot =
	| { kind: 'competitor'; competitorId: number; team?: number }
	| { kind: 'winner'; ref: string }
	| { kind: 'loser'; ref: string }
	| { kind: 'heatPlace'; ref: string; place: number }
	| { kind: 'bye' };

export type MatchKind = 'ffa' | 'duel' | 'team' | 'heat' | 'final' | 'score' | 'solo';

/** One materializable match produced by the engine (before persistence). */
export type MatchSpec = {
	ref: string; // unique within a plan
	round: number;
	group?: number; // heat / group index
	label: string;
	slots: MatchSlot[];
	bestOf: number;
	kind: MatchKind;
};

export type FormatPlan = {
	formatType: FormatType;
	matches: MatchSpec[];
	estimateMinutes: number;
	rationale: string;
	config: Record<string, unknown>;
};

export type FormatContext = {
	competitorIds: number[]; // in seed order
	maxPlayers: number;
	mode: GameMode;
	scoringType: ScoringType;
	roundMinutes: number;
	teamSize?: number | null;
	timeBudgetMinutes: number;
	bestOf?: number;
	formatOverride?: FormatType;
};
