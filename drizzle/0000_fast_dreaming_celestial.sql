CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`photographer_name` text NOT NULL,
	`submitter_email` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_object_key_unique` ON `submissions` (`object_key`);