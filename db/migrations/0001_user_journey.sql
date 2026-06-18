-- Add Dream Life Statement and user profile
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"dream_statement" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- Add materialised dream score per user
CREATE TABLE "user_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"dream_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"last_computed" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add journal entries table (freeform, optionally linked to goal and/or habit)
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"goal_id" uuid,
	"habit_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add goal templates table
CREATE TABLE "goal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" text,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"pack" varchar(60) NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"install_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add weight to goals (for Dream Life Score calculation)
ALTER TABLE "goals" ADD COLUMN "weight" numeric(3, 2) DEFAULT '1.00' NOT NULL;
--> statement-breakpoint

-- Add goalId to habit_templates so habits can be bundled under goal templates
ALTER TABLE "habit_templates" ADD COLUMN "goal_template_id" uuid;
--> statement-breakpoint

-- Add goalId to partner_comments (already had habitId; now supports goal comments too)
ALTER TABLE "partner_comments" ADD COLUMN "goal_id" uuid;
--> statement-breakpoint

-- Foreign key constraints
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_templates" ADD CONSTRAINT "goal_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_comments" ADD CONSTRAINT "partner_comments_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
