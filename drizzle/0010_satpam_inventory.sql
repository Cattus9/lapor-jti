CREATE TABLE "satpam_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"founder_name" text,
	"status" text DEFAULT 'tersimpan' NOT NULL,
	"storage_location" text DEFAULT 'Pos Satpam' NOT NULL,
	"photo_url" text,
	"photo_storage_key" text,
	"photo_mime_type" text,
	"photo_name" text,
	"handover_recipient" text,
	"handover_note" text,
	"handed_over_at" timestamp (3) with time zone,
	"registered_by" uuid NOT NULL,
	"registered_by_name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "satpam_inventory_name_check" CHECK (length(trim("satpam_inventory"."item_name")) between 1 and 200),
	CONSTRAINT "satpam_inventory_status_check" CHECK ("satpam_inventory"."status" in ('tersimpan', 'diserahkan'))
);
--> statement-breakpoint
ALTER TABLE "satpam_inventory" ADD CONSTRAINT "satpam_inventory_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "satpam_inventory_created_idx" ON "satpam_inventory" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "satpam_inventory_status_created_idx" ON "satpam_inventory" USING btree ("status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);