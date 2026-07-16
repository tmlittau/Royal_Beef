CREATE TABLE `controllers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image` text NOT NULL,
	`label` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`sort_index` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `controllers_image_unique` ON `controllers` (`image`);--> statement-breakpoint
ALTER TABLE `competition_games` ADD `picked_by` integer;--> statement-breakpoint
ALTER TABLE `competition_games` ADD `pick_round` integer;--> statement-breakpoint
ALTER TABLE `competitions` ADD `games_per_player` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `competitions` ADD `current_picker_id` integer;--> statement-breakpoint
ALTER TABLE `competitions` ADD `controller_order` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitors` ADD `controller_id` integer REFERENCES controllers(id);