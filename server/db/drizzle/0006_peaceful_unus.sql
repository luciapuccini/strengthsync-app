DELETE FROM `weeks`;--> statement-breakpoint
DELETE FROM `plans`;--> statement-breakpoint
DELETE FROM `client_profiles`;--> statement-breakpoint
ALTER TABLE `client_profiles` RENAME COLUMN "height_cm" TO "height_in";--> statement-breakpoint
ALTER TABLE `clients` ADD `unit_preference` text DEFAULT 'imperial' NOT NULL;
