CREATE TABLE `tasteit_sync` (
	`account_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text,
	`updated_at` text NOT NULL
);
