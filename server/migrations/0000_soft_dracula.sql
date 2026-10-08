CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`model` text NOT NULL,
	`plate` text NOT NULL,
	`person` text NOT NULL,
	`maintenance` text NOT NULL,
	`due_date` text NOT NULL,
	`maintenance_notes` text NOT NULL,
	`notes` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`event` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_history_vehicle_started` ON `history` (`vehicle_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_history_period` ON `history` (`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_history_open_vehicle` ON `history` (`vehicle_id`) WHERE "history"."ended_at" IS NULL;--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`plate` text NOT NULL,
	`person` text DEFAULT '' NOT NULL,
	`maintenance` text DEFAULT 'unknown' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`maintenance_notes` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`revision` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vehicles_active_plate` ON `vehicles` (`plate`) WHERE "vehicles"."deleted_at" IS NULL;