CREATE TABLE "found_notice_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"report_id" uuid,
	"inventory_id" uuid,
	"read_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "found_notice_read_source_check" CHECK (("found_notice_reads"."report_id" is not null)::integer + ("found_notice_reads"."inventory_id" is not null)::integer = 1)
);
--> statement-breakpoint
ALTER TABLE "found_notice_reads" ADD CONSTRAINT "found_notice_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "found_notice_reads" ADD CONSTRAINT "found_notice_reads_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "found_notice_reads" ADD CONSTRAINT "found_notice_reads_inventory_id_satpam_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."satpam_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "found_notice_read_user_report_unique" ON "found_notice_reads" USING btree ("user_id","report_id") WHERE "found_notice_reads"."report_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "found_notice_read_user_inventory_unique" ON "found_notice_reads" USING btree ("user_id","inventory_id") WHERE "found_notice_reads"."inventory_id" is not null;--> statement-breakpoint
CREATE INDEX "found_notice_read_report_idx" ON "found_notice_reads" USING btree ("report_id") WHERE "found_notice_reads"."report_id" is not null;--> statement-breakpoint
CREATE INDEX "found_notice_read_inventory_idx" ON "found_notice_reads" USING btree ("inventory_id") WHERE "found_notice_reads"."inventory_id" is not null;