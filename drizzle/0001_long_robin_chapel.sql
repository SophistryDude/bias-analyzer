ALTER TABLE "claims" ADD COLUMN "epistemological_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "epistemological_confidence" real;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "category_error" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "disguised_as" text;--> statement-breakpoint
ALTER TABLE "pundits" ADD COLUMN "corporate_parent" text;--> statement-breakpoint
ALTER TABLE "pundits" ADD COLUMN "ownership_type" text;--> statement-breakpoint
ALTER TABLE "pundits" ADD COLUMN "financial_interests" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "pundits" ADD COLUMN "funding_sources" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "pundits" ADD COLUMN "country" text DEFAULT 'US';--> statement-breakpoint
ALTER TABLE "story_coverages" ADD COLUMN "first_published_at" timestamp;--> statement-breakpoint
ALTER TABLE "story_coverages" ADD COLUMN "last_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "story_coverages" ADD COLUMN "coverage_order" text;