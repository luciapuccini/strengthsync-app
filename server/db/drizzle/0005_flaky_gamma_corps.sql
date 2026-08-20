CREATE TABLE `client_identities` (
	`client_id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_identities_subject_unique` ON `client_identities` (`subject`);