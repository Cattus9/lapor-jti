CREATE TABLE "satpam_loss_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_name" text NOT NULL,
	"characteristics" text NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"photo_storage_key" text,
	"photo_mime_type" text,
	"photo_name" text,
	"registered_by" uuid NOT NULL,
	"registered_by_name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "satpam_loss_reports_name_check" CHECK (length(trim("satpam_loss_reports"."item_name")) between 1 and 200),
	CONSTRAINT "satpam_loss_reports_characteristics_check" CHECK (length(trim("satpam_loss_reports"."characteristics")) between 1 and 2000),
	CONSTRAINT "satpam_loss_reports_description_check" CHECK (length(trim("satpam_loss_reports"."description")) between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD COLUMN "found_location" text;--> statement-breakpoint
ALTER TABLE "satpam_loss_reports" ADD CONSTRAINT "satpam_loss_reports_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "satpam_loss_reports_created_idx" ON "satpam_loss_reports" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD CONSTRAINT "satpam_inventory_found_location_check" CHECK ("satpam_inventory"."found_location" is null or length(trim("satpam_inventory"."found_location")) between 1 and 200);