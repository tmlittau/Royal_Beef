// Seeds the starter game library (only when empty) and syncs the controller
// inventory from the images folder (always, idempotent). Safe on every Docker boot.
import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'node:fs';

const url = process.env.DATABASE_URL ?? 'royalbeef.db';
const CONTROLLERS_DIR = process.env.CONTROLLERS_DIR ?? 'data/controllers';

const prettyLabel = (file) =>
	file
		.replace(/\.[^.]+$/, '')
		.split(/[-_]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

function syncControllers(db) {
	if (!existsSync(CONTROLLERS_DIR)) {
		console.log(`[seed] no controllers dir at ${CONTROLLERS_DIR} — skipping controllers.`);
		return;
	}
	const files = readdirSync(CONTROLLERS_DIR)
		.filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f))
		.sort();
	const existing = new Set(db.prepare('SELECT image FROM controllers').all().map((r) => r.image));
	const insert = db.prepare(
		'INSERT INTO controllers (image, label, quantity, sort_index) VALUES (?, ?, 1, ?)'
	);
	let added = 0;
	files.forEach((f, i) => {
		if (!existing.has(f)) {
			insert.run(f, prettyLabel(f), i);
			added++;
		}
	});
	console.log(`[seed] controllers: ${files.length} image(s), ${added} new.`);
}

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
	['Overcooked 2', 1, 4, 5, ['coop_score'], 'coop_score', null, 'score', [score('High score')], 'More frantic co-op cooking.'],
	['Unspottable', 2, 4, 4, ['one_vs_all', 'ffa'], 'one_vs_all', null, 'placement', [count('Catches')], 'Spot the human among the robots — one hunter against the rest.']
];

const db = new Database(url);
db.pragma('foreign_keys = ON');

// Games — only when the library is empty.
const existing = db.prepare('SELECT COUNT(*) AS n FROM games').get().n;
if (existing > 0) {
	console.log(`[seed] games table already has ${existing} rows — skipping games.`);
} else {
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
}

// Controllers — always sync from the images folder (idempotent).
syncControllers(db);

db.close();
