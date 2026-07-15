CREATE TABLE `competition_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mode` text DEFAULT 'ffa' NOT NULL,
	`max_players` integer NOT NULL,
	`round_minutes` integer NOT NULL,
	`team_size` integer,
	`format_type` text NOT NULL,
	`format_config` text DEFAULT '{}' NOT NULL,
	`estimated_minutes` integer,
	`finished_at` integer,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'setup' NOT NULL,
	`points_scheme` text DEFAULT '[3,2,1]' NOT NULL,
	`time_budget_minutes` integer DEFAULT 30 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#ff6a2b' NOT NULL,
	`seed` integer,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_game_id` integer NOT NULL,
	`competitor_id` integer NOT NULL,
	`final_rank` integer NOT NULL,
	`competition_points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`competition_game_id`) REFERENCES `competition_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`steam_app_id` integer,
	`cover_url` text,
	`description` text,
	`min_players` integer DEFAULT 2 NOT NULL,
	`max_players` integer DEFAULT 4 NOT NULL,
	`default_round_minutes` integer DEFAULT 5 NOT NULL,
	`supported_modes` text DEFAULT '["ffa"]' NOT NULL,
	`default_mode` text DEFAULT 'ffa' NOT NULL,
	`team_size` integer,
	`scoring_type` text DEFAULT 'placement' NOT NULL,
	`stat_definitions` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `match_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`competitor_id` integer,
	`team_index` integer,
	`placement` integer,
	`raw_score` real,
	`is_winner` integer DEFAULT false NOT NULL,
	`source_ref` text,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_game_id` integer NOT NULL,
	`round_index` integer DEFAULT 0 NOT NULL,
	`group_index` integer,
	`bracket_slot` text,
	`label` text,
	`best_of` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`feeds_from` text DEFAULT '{}' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`competition_game_id`) REFERENCES `competition_games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stat_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_game_id` integer NOT NULL,
	`match_id` integer,
	`competitor_id` integer NOT NULL,
	`stat_key` text NOT NULL,
	`value_num` real,
	`value_text` text,
	FOREIGN KEY (`competition_game_id`) REFERENCES `competition_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE cascade
);
