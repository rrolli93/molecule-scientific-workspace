CREATE TABLE `research_notebooks` (
	`owner` text NOT NULL,
	`workspace_id` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`document` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `workspace_id`)
);
