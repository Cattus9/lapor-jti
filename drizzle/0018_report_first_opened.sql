ALTER TABLE "reports" ADD COLUMN "first_opened_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "first_opened_tracking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "first_opened_tracking" SET DEFAULT true;
