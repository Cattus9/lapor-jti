ALTER TABLE "satpam_loss_reports" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD COLUMN "incident_date" text;--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD COLUMN "incident_time" text;--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD CONSTRAINT "satpam_loss_reports_title_check" CHECK ("satpam_loss_reports"."title" is null or length(trim("satpam_loss_reports"."title")) between 1 and 200);--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD CONSTRAINT "satpam_loss_reports_location_check" CHECK ("satpam_loss_reports"."location" is null or length(trim("satpam_loss_reports"."location")) between 1 and 200);