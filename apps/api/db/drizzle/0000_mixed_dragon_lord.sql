CREATE TABLE `client_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`sex` text,
	`age` integer,
	`height_cm` real,
	`goals` text NOT NULL,
	`body_composition` text NOT NULL,
	`strength_loads` text NOT NULL,
	`nutrition` text,
	`swimming` text,
	`schedule_preferences` text,
	`notes` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_profiles_client_id_unique` ON `client_profiles` (`client_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_id` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clients_coach_id_idx` ON `clients` (`coach_id`);--> statement-breakpoint
CREATE TABLE `coaches` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`auth_subject_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`total_weeks` integer NOT NULL,
	`week_template` text NOT NULL,
	`rationale` text,
	`activated_at` text,
	`workflow_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_one_active_per_client` ON `plans` (`client_id`) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX `plans_client_id_idx` ON `plans` (`client_id`);--> statement-breakpoint
CREATE TABLE `weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`week_index` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text NOT NULL,
	`schedule` text NOT NULL,
	`workflow_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weeks_one_in_flight_per_client` ON `weeks` (`client_id`) WHERE status = 'in_flight';--> statement-breakpoint
CREATE INDEX `weeks_client_plan_idx` ON `weeks` (`client_id`,`plan_id`);