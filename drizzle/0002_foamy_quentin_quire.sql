PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_competition_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competition_id` integer NOT NULL,
	`game_id` integer NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`mode` text DEFAULT 'ffa' NOT NULL,
	`max_players` integer NOT NULL,
	`round_minutes` integer NOT NULL,
	`team_size` integer,
	`format_type` text,
	`format_config` text DEFAULT '{}' NOT NULL,
	`estimated_minutes` integer,
	`finished_at` integer,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_competition_games`("id", "competition_id", "game_id", "order_index", "status", "mode", "max_players", "round_minutes", "team_size", "format_type", "format_config", "estimated_minutes", "finished_at") SELECT "id", "competition_id", "game_id", "order_index", "status", "mode", "max_players", "round_minutes", "team_size", "format_type", "format_config", "estimated_minutes", "finished_at" FROM `competition_games`;--> statement-breakpoint
DROP TABLE `competition_games`;--> statement-breakpoint
ALTER TABLE `__new_competition_games` RENAME TO `competition_games`;--> statement-breakpoint
PRAGMA foreign_keys=ON;