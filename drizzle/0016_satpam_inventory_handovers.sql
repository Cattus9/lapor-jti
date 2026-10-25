ALTER TABLE "report_handovers" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_handovers" ALTER COLUMN "officer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_handovers" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "inventory_id" uuid;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "loss_report_id" uuid;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "submission_key" uuid;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "submission_fingerprint" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "ownership_evidence" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "legacy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "source_found_report_id" uuid;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "submission_key" uuid;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "submission_fingerprint" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_inventory_id_satpam_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."satpam_inventory"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_loss_report_id_reports_id_fk" FOREIGN KEY ("loss_report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD CONSTRAINT "satpam_inventory_source_found_report_id_reports_id_fk" FOREIGN KEY ("source_found_report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_inventory_id_unique" UNIQUE("inventory_id");--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_loss_report_id_unique" UNIQUE("loss_report_id");--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "report_handovers_submission_key_unique" UNIQUE("submission_key");--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD CONSTRAINT "satpam_inventory_source_found_report_id_unique" UNIQUE("source_found_report_id");--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD CONSTRAINT "satpam_inventory_submission_key_unique" UNIQUE("submission_key");--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_source_check" CHECK (("report_handovers"."match_id" is not null)::integer + ("report_handovers"."inventory_id" is not null)::integer = 1);--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_actor_check" CHECK ("report_handovers"."legacy" or ("report_handovers"."actor_id" is not null and "report_handovers"."officer_id" is not null));--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_inventory_evidence_check" CHECK ("report_handovers"."inventory_id" is null or "report_handovers"."legacy" or (length(trim("report_handovers"."ownership_evidence")) between 1 and 1000 and "report_handovers"."submission_key" is not null and "report_handovers"."submission_fingerprint" is not null));--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_loss_source_check" CHECK ("report_handovers"."loss_report_id" is null or "report_handovers"."inventory_id" is not null);
--> statement-breakpoint
-- Preserve historic inventory returns without inventing a handing-over officer.
INSERT INTO report_handovers (inventory_id, officer_name, actor_name, recipient, location, note, handed_over_at, legacy)
SELECT id, 'Tidak tercatat (data lama)', 'Tidak tercatat (data lama)',
  coalesce(nullif(trim(handover_recipient), ''), 'Penerima tidak tercatat'),
  storage_location, coalesce(handover_note, ''), coalesce(handed_over_at, updated_at, created_at), true
FROM satpam_inventory WHERE status = 'diserahkan'
ON CONFLICT (inventory_id) DO NOTHING;
