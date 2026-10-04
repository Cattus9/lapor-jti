CREATE TABLE "lost_found_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loss_report_id" uuid NOT NULL,
	"found_report_id" uuid NOT NULL,
	"matched_by" uuid NOT NULL,
	"matched_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp (3) with time zone,
	CONSTRAINT "lost_found_matches_loss_report_id_unique" UNIQUE("loss_report_id"),
	CONSTRAINT "lost_found_matches_found_report_id_unique" UNIQUE("found_report_id"),
	CONSTRAINT "lost_found_distinct_reports_check" CHECK ("lost_found_matches"."loss_report_id" <> "lost_found_matches"."found_report_id"),
	CONSTRAINT "lost_found_completion_date_check" CHECK ("lost_found_matches"."completed_at" is null or "lost_found_matches"."completed_at" >= "lost_found_matches"."matched_at")
);
--> statement-breakpoint
CREATE TABLE "report_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"officer_id" uuid NOT NULL,
	"officer_name" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"recipient" text NOT NULL,
	"location" text NOT NULL,
	"note" text NOT NULL,
	"handed_over_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_handovers_match_id_unique" UNIQUE("match_id"),
	CONSTRAINT "handover_recipient_check" CHECK (length(trim("report_handovers"."recipient")) between 1 and 150),
	CONSTRAINT "handover_location_check" CHECK (length(trim("report_handovers"."location")) between 1 and 200),
	CONSTRAINT "handover_note_check" CHECK (length("report_handovers"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "security_officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "security_officer_name_check" CHECK (length(trim("security_officers"."name")) between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "lost_found_matches" ADD CONSTRAINT "lost_found_matches_loss_report_id_reports_id_fk" FOREIGN KEY ("loss_report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_matches" ADD CONSTRAINT "lost_found_matches_found_report_id_reports_id_fk" FOREIGN KEY ("found_report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_matches" ADD CONSTRAINT "lost_found_matches_matched_by_users_id_fk" FOREIGN KEY ("matched_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_match_id_lost_found_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."lost_found_matches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_officer_id_security_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."security_officers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_pending_date_idx" ON "lost_found_matches" USING btree ("matched_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "lost_found_matches"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "handovers_date_idx" ON "report_handovers" USING btree ("handed_over_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "handovers_officer_date_idx" ON "report_handovers" USING btree ("officer_id","handed_over_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_handler_date_idx" ON "reports" USING btree ("handler_role","submitted_at" DESC NULLS LAST,"id" DESC NULLS LAST);