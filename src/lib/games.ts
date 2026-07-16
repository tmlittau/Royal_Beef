// Shared, client-safe constants + helpers for games and their properties.

export type GameMode = 'ffa' | '1v1' | 'teams' | 'coop_score' | 'one_vs_all';
export type ScoringType = 'placement' | 'score' | 'time';
export type StatType = 'number' | 'time' | 'count';
export type Aggregate = 'sum' | 'max' | 'min' | 'avg';

export const MODES: { value: GameMode; label: string; hint: string }[] = [
	{ value: 'ffa', label: 'Free-for-all', hint: 'Everyone for themselves' },
	{ value: '1v1', label: '1 vs 1', hint: 'Two players head-to-head' },
	{ value: 'teams', label: 'Teams', hint: 'Split into teams' },
	{ value: 'coop_score', label: 'Co-op score', hint: 'Shared goal, best score wins' },
	{ value: 'one_vs_all', label: 'One vs all', hint: 'One player against everyone — everyone takes a turn' }
];

export const SCORING_TYPES: { value: ScoringType; label: string; hint: string }[] = [
	{ value: 'placement', label: 'Placement', hint: 'Enter finishing order (1st, 2nd, …)' },
	{ value: 'score', label: 'Score', hint: 'Enter a score — higher is better' },
	{ value: 'time', label: 'Time', hint: 'Enter a time — lower is better' }
];

export const STAT_TYPES: { value: StatType; label: string }[] = [
	{ value: 'count', label: 'Count' },
	{ value: 'number', label: 'Number' },
	{ value: 'time', label: 'Time' }
];

export const AGGREGATES: { value: Aggregate; label: string }[] = [
	{ value: 'sum', label: 'Sum' },
	{ value: 'max', label: 'Max' },
	{ value: 'min', label: 'Min' },
	{ value: 'avg', label: 'Average' }
];

export type StatRow = {
	label: string;
	type: StatType;
	aggregate: Aggregate;
	higherIsBetter: boolean;
};

/** Loose, all-optional shape used to prefill the game form (new + edit + error re-render). */
export type GameFormInitial = {
	name?: string;
	description?: string | null;
	coverUrl?: string | null;
	minPlayers?: number;
	maxPlayers?: number;
	defaultRoundMinutes?: number;
	supportedModes?: string[];
	defaultMode?: string;
	teamSize?: number | null;
	scoringType?: string;
	notes?: string | null;
	statDefinitions?: StatRow[];
};

export function modeLabel(value: string): string {
	return MODES.find((m) => m.value === value)?.label ?? value;
}

export function scoringLabel(value: string): string {
	return SCORING_TYPES.find((s) => s.value === value)?.label ?? value;
}

/** Turn a human label into a stable snake_case stat key. */
export function slugifyKey(label: string): string {
	return label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/** Format a player range like "2–4" or "2" when both ends match. */
export function playerRange(min: number, max: number): string {
	return min === max ? `${min}` : `${min}–${max}`;
}

/** Distinct, dark-theme-friendly competitor colors (brand hues first). */
export const COMPETITOR_COLORS = [
	'#ff6a2b', // orange
	'#35e0c1', // mint
	'#ffb020', // amber
	'#6a8bff', // blue
	'#ff2d55', // red
	'#b06aff', // violet
	'#5ad469', // green
	'#ff6ab0', // pink
	'#48b0f7', // sky
	'#e0c035', // gold
	'#ff8f5a', // coral
	'#8a8f98' // slate
];

export function colorForIndex(i: number): string {
	return COMPETITOR_COLORS[i % COMPETITOR_COLORS.length];
}

/** Initials from a name, up to 2 letters. */
export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('');
}
