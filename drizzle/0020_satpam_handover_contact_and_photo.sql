ALTER TABLE "report_handovers" ADD COLUMN "recipient_email" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "recipient_phone" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "photo_storage_key" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "photo_mime_type" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD COLUMN "photo_name" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_recipient_email" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_recipient_phone" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_photo_url" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_photo_storage_key" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_photo_mime_type" text;--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "handover_photo_name" text;--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_recipient_email_check" CHECK ("report_handovers"."recipient_email" is null or length(trim("report_handovers"."recipient_email")) between 3 and 255);--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_recipient_phone_check" CHECK ("report_handovers"."recipient_phone" is null or length(trim("report_handovers"."recipient_phone")) between 3 and 50);--> statement-breakpoint
ALTER TABLE "report_handovers" ADD CONSTRAINT "handover_contact_check" CHECK ("report_handovers"."legacy" or ("report_handovers"."handed_over_at" < timestamp with time zone '2026-11-06 17:00:00+07') or (length(trim(coalesce("report_handovers"."recipient_email", ''))) > 0 or length(trim(coalesce("report_handovers"."recipient_phone", ''))) > 0));