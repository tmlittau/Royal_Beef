CREATE TABLE `steam_app_cache` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `steam_search_cache` (
	`query` text PRIMARY KEY NOT NULL,
	`results` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL
);
