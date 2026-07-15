// Seeds the starter game library. Idempotent: only runs when `games` is empty,
// so it is safe to call on every Docker boot. Uses raw SQL (no TS schema import).
import Database from 'better-sqlite3';

const url = process.env.DATABASE_URL ?? 'royalbeef.db';

// Stat helpers keep the data below readable.
const count = (label, higherIsBetter = true) => ({
	key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
	label,
	type: 'count',
	aggregate: 'sum',
	higherIsBetter
});
const time = (label) => ({
	key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
	label,
	type: 'time',
	aggregate: 'min',
	higherIsBetter: false
});
const score = (label) => ({
	key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
	label,
	type: 'number',
	aggregate: 'max',
	higherIsBetter: true
});

/**
 * Starter library — sensible defaults to verify/tweak in the UI.
 * [name, min, max, roundMin, modes[], defaultMode, teamSize|null, scoringType, stats[], description]
 */
const GAMES = [
	['Gang Beasts', 2, 4, 3, ['ffa', 'teams'], 'ffa', 2, 'placement', [count('KOs'), count('Deaths', false)], 'Silly jelly-brawler; last one standing.'],
	['Nidhogg', 2, 2, 4, ['1v1'], '1v1', null, 'placement', [count('Kills')], 'Fencing tug-of-war; reach the far edge.'],
	['Lance A Lot', 2, 4, 3, ['ffa', 'teams'], 'ffa', 2, 'placement', [count('Kills')], 'Jousting on rockets. Chaos.'],
	['Toybox Turbos', 2, 4, 4, ['ffa'], 'ffa', null, 'placement', [count('Wins'), time('Best lap')], 'Top-down micro-machines racing.'],
	['Move or Die', 2, 4, 5, ['ffa'], 'ffa', null, 'placement', [count('Round wins')], 'Rules change every 20 seconds.'],
	['Hyper Jam', 2, 4, 4, ['ffa'], 'ffa', null, 'placement', [count('Kills'), count('Deaths', false)], 'Neon arena brawler with perk drafting.'],
	['Tricky Towers', 2, 4, 5, ['ffa'], 'ffa', null, 'placement', [count('Round wins'), count('Lines')], 'Physics Tetris duels.'],
	['Road Redemption', 2, 4, 5, ['ffa'], 'ffa', null, 'placement', [count('Takedowns')], 'Motorcycle combat racing.'],
	['Quiplash', 3, 8, 10, ['ffa'], 'ffa', null, 'placement', [count('Quiplash wins')], 'Phone-answered party wit contest.'],
	['SpeedRunners', 2, 4, 3, ['ffa'], 'ffa', null, 'placement', [count('Wins'), time('Best time')], 'Grapple-hook platform racing.'],
	['Swordy', 2, 4, 3, ['ffa', 'teams'], 'ffa', 2, 'placement', [count('Kills')], 'Physics sword-fighting.'],
	['Laser League', 2, 4, 5, ['teams'], 'teams', 2, 'placement', [count('Zone kills')], 'Fast-paced neon team sport.'],
	['Totemori', 2, 4, 4, ['ffa'], 'ffa', null, 'placement', [count('Round wins')], 'Build your tower, topple theirs.'],
	['Rock of Ages 3', 2, 4, 6, ['ffa'], 'ffa', null, 'placement', [count('Wins')], 'Boulder-rolling tower defense.'],
	['WWE 2K Battlegrounds', 2, 4, 6, ['1v1', 'ffa'], '1v1', null, 'placement', [count('Wins')], 'Arcade wrestling.'],
	['Overcooked', 1, 4, 5, ['coop_score'], 'coop_score', null, 'score', [score('High score')], 'Frantic co-op cooking.'],
	['Overcooked 2', 1, 4, 5, ['coop_score'], 'coop_score', null, 'score', [score('High score')], 'More frantic co-op cooking.']
];

const db = new Database(url);
db.pragma('foreign_keys = ON');

const existing = db.prepare('SELECT COUNT(*) AS n FROM games').get().n;
if (existing > 0) {
	console.log(`[seed] games table already has ${existing} rows — skipping.`);
	db.close();
	process.exit(0);
}

const insert = db.prepare(`
	INSERT INTO games
		(name, min_players, max_players, default_round_minutes, supported_modes,
		 default_mode, team_size, scoring_type, stat_definitions, description)
	VALUES
		(@name, @min, @max, @roundMin, @modes, @defaultMode, @teamSize, @scoring, @stats, @description)
`);

const insertAll = db.transaction((rows) => {
	for (const [name, min, max, roundMin, modes, defaultMode, teamSize, scoring, stats, description] of rows) {
		insert.run({
			name,
			min,
			max,
			roundMin,
			modes: JSON.stringify(modes),
			defaultMode,
			teamSize,
			scoring,
			stats: JSON.stringify(stats),
			description
		});
	}
});

insertAll(GAMES);
console.log(`[seed] inserted ${GAMES.length} games into ${url}`);
db.close();
