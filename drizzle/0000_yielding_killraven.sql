CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"manipulation_score" integer NOT NULL,
	"overall_assessment" text NOT NULL,
	"human_reviewed" boolean DEFAULT false NOT NULL,
	"human_review_notes" text,
	"llm_enhanced" boolean DEFAULT false NOT NULL,
	"bias_leaning" text NOT NULL,
	"bias_confidence" real NOT NULL,
	"tone_score" real DEFAULT 0 NOT NULL,
	"balance_score" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "axis_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"axis_id" text NOT NULL,
	"value" real NOT NULL,
	"confidence" real NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"trend" text
);
--> statement-breakpoint
CREATE TABLE "bias_indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"excerpt" text NOT NULL,
	"direction" text NOT NULL,
	"weight" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"post_type" text NOT NULL,
	"related_analysis_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_pundit_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_story_id" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"statement" text NOT NULL,
	"claim_type" text NOT NULL,
	"significance" text NOT NULL,
	"verifiability" text NOT NULL,
	"verification_source" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verification_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_hashes" (
	"hash" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"content_type" text NOT NULL,
	"source_id" text,
	"source_name" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"raw_text" text NOT NULL,
	"word_count" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fallacy_detections" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"fallacy_id" text NOT NULL,
	"fallacy_name" text NOT NULL,
	"confidence" real NOT NULL,
	"excerpt" text NOT NULL,
	"explanation" text NOT NULL,
	"human_verified" boolean DEFAULT false NOT NULL,
	"human_correction" text
);
--> statement-breakpoint
CREATE TABLE "leaning_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"pundit_id" text NOT NULL,
	"date" text NOT NULL,
	"leaning" text NOT NULL,
	"evidence" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitored_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"pundit_id" text,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"scrape_interval_minutes" integer DEFAULT 60 NOT NULL,
	"last_checked_at" timestamp,
	"last_content_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overton_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"date" text NOT NULL,
	"left_edge" real NOT NULL,
	"right_edge" real NOT NULL,
	"center" real NOT NULL,
	"width" real NOT NULL,
	"evidence" text NOT NULL,
	"key_events" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "political_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"pundit_id" text NOT NULL,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"ideological_coherence" real NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pundits" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_leaning" text DEFAULT 'unclassified' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"known_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"external_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pundits_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reframing_detections" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"technique" text NOT NULL,
	"technique_name" text NOT NULL,
	"confidence" real NOT NULL,
	"excerpt" text NOT NULL,
	"explanation" text NOT NULL,
	"suggested_neutral_framing" text,
	"human_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"coverage_id" text NOT NULL,
	"status" text NOT NULL,
	"source_wording" text,
	"wording_divergence" text,
	"divergent_detail" text,
	"attributed_to" text
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "story_coverages" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"content_id" text NOT NULL,
	"source_id" text,
	"key_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"tone_score" real,
	"framing_type" text,
	"axis_economic" real,
	"axis_speech" real,
	"axis_progressive" real,
	"axis_liberal_conservative" real,
	"axis_foreign_policy" real,
	"comparison_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_examples" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"content_id" text,
	"labeled_by" text NOT NULL,
	"labeled_at" timestamp DEFAULT now() NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"example_id" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"start_index" integer NOT NULL,
	"end_index" integer NOT NULL,
	"confidence" real NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "axis_positions" ADD CONSTRAINT "axis_positions_profile_id_political_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."political_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bias_indicators" ADD CONSTRAINT "bias_indicators_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_hashes" ADD CONSTRAINT "content_hashes_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_source_id_pundits_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."pundits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fallacy_detections" ADD CONSTRAINT "fallacy_detections_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaning_snapshots" ADD CONSTRAINT "leaning_snapshots_pundit_id_pundits_id_fk" FOREIGN KEY ("pundit_id") REFERENCES "public"."pundits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitored_sources" ADD CONSTRAINT "monitored_sources_pundit_id_pundits_id_fk" FOREIGN KEY ("pundit_id") REFERENCES "public"."pundits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "political_profiles" ADD CONSTRAINT "political_profiles_pundit_id_pundits_id_fk" FOREIGN KEY ("pundit_id") REFERENCES "public"."pundits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reframing_detections" ADD CONSTRAINT "reframing_detections_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_claims" ADD CONSTRAINT "source_claims_coverage_id_story_coverages_id_fk" FOREIGN KEY ("coverage_id") REFERENCES "public"."story_coverages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_coverages" ADD CONSTRAINT "story_coverages_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_coverages" ADD CONSTRAINT "story_coverages_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_coverages" ADD CONSTRAINT "story_coverages_source_id_pundits_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."pundits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_examples" ADD CONSTRAINT "training_examples_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_labels" ADD CONSTRAINT "training_labels_example_id_training_examples_id_fk" FOREIGN KEY ("example_id") REFERENCES "public"."training_examples"("id") ON DELETE cascade ON UPDATE no action;