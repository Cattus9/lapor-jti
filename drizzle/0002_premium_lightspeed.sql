CREATE TYPE "public"."report_category" AS ENUM('kehilangan-temuan', 'fasilitas', 'layanan', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."report_handler" AS ENUM('satpam', 'teknisi', 'manajemen');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('baru', 'diverifikasi', 'diproses', 'barang_teridentifikasi', 'diserahkan', 'selesai', 'ditolak');--> statement-breakpoint
CREATE TABLE "facility_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "facility_objects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"report_id" uuid,
	"draft_id" uuid,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachment_parent_check" CHECK (("report_attachments"."report_id" is not null)::integer + ("report_attachments"."draft_id" is not null)::integer = 1),
	CONSTRAINT "attachment_size_check" CHECK ("report_attachments"."size" > 0 and "report_attachments"."size" <= 5242880)
);
--> statement-breakpoint
CREATE TABLE "report_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"submitted_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_facility_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"object_id" text,
	"object_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_lost_found_details" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"item_name" text NOT NULL,
	"item_details" text NOT NULL,
	CONSTRAINT "lost_found_kind_check" CHECK ("report_lost_found_details"."kind" in ('kehilangan', 'temuan'))
);
--> statement-breakpoint
CREATE TABLE "report_other_details" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"category_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_service_details" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"service_name" text NOT NULL,
	"program" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"from_status" "report_status",
	"to_status" "report_status" NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_ticket_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"value" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"submission_key" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"category" "report_category" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"incident_date" date NOT NULL,
	"incident_time" time NOT NULL,
	"location_id" text,
	"location_text" text NOT NULL,
	"handler_role" "report_handler" NOT NULL,
	"status" "report_status" DEFAULT 'baru' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_ticket_number_unique" UNIQUE("ticket_number"),
	CONSTRAINT "reports_submission_key_unique" UNIQUE("submission_key"),
	CONSTRAINT "reports_completion_status_check" CHECK (("reports"."status" = 'selesai') = ("reports"."completed_at" is not null)),
	CONSTRAINT "reports_title_check" CHECK (length(trim("reports"."title")) between 1 and 200),
	CONSTRAINT "reports_description_check" CHECK (length(trim("reports"."description")) between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "services_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_draft_id_report_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."report_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_drafts" ADD CONSTRAINT "report_drafts_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_drafts" ADD CONSTRAINT "report_drafts_submitted_report_id_reports_id_fk" FOREIGN KEY ("submitted_report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_facility_objects" ADD CONSTRAINT "report_facility_objects_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_facility_objects" ADD CONSTRAINT "report_facility_objects_object_id_facility_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."facility_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_lost_found_details" ADD CONSTRAINT "report_lost_found_details_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_other_details" ADD CONSTRAINT "report_other_details_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_service_details" ADD CONSTRAINT "report_service_details_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_service_details" ADD CONSTRAINT "report_service_details_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_status_history" ADD CONSTRAINT "report_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_date_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_report_idx" ON "notifications" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "attachments_report_idx" ON "report_attachments" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "attachments_draft_idx" ON "report_attachments" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "drafts_reporter_updated_idx" ON "report_drafts" USING btree ("reporter_id","updated_at" DESC NULLS LAST) WHERE "report_drafts"."submitted_report_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "report_object_unique" ON "report_facility_objects" USING btree ("report_id","object_text");--> statement-breakpoint
CREATE INDEX "report_facility_object_idx" ON "report_facility_objects" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "history_report_date_idx" ON "report_status_history" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_reporter_date_idx" ON "reports" USING btree ("reporter_id","submitted_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "reports_handler_status_date_idx" ON "reports" USING btree ("handler_role","status","submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_category_date_idx" ON "reports" USING btree ("category","submitted_at");--> statement-breakpoint
CREATE INDEX "reports_location_active_idx" ON "reports" USING btree ("location_id","status") WHERE "reports"."status" not in ('selesai', 'ditolak');--> statement-breakpoint
CREATE INDEX "reports_completed_at_idx" ON "reports" USING btree ("completed_at") WHERE "reports"."completed_at" is not null;
--> statement-breakpoint
-- Reference choices from the existing campus form, not demo users or demo reports.
INSERT INTO "locations" ("id", "name", "group_name") VALUES
('location-1', 'Lab RSI', 'Lantai 2'),
('location-2', 'Lab Jaringan 1', 'Lantai 2'),
('location-3', 'Lab Jaringan 2', 'Lantai 2'),
('location-4', 'Lab Multimedia', 'Lantai 2'),
('location-5', 'Ruang 3.1', 'Lantai 3'),
('location-6', 'Ruang 3.2', 'Lantai 3'),
('location-7', 'Ruang 3.3', 'Lantai 3'),
('location-8', 'Ruang 3.4', 'Lantai 3'),
('location-9', 'Ruang 3.5', 'Lantai 3'),
('location-10', 'Ruang 3.6', 'Lantai 3'),
('location-11', 'Ruang 3.7', 'Lantai 3'),
('location-12', 'Ruang 3.8', 'Lantai 3'),
('location-13', 'Ruang 3.9', 'Lantai 3'),
('location-14', 'Ruang 3.10', 'Lantai 3'),
('location-15', 'Ruang 3.11', 'Lantai 3'),
('location-16', 'Ruang 3.12', 'Lantai 3'),
('location-17', 'Ruang 4.1', 'Lantai 4'),
('location-18', 'Ruang 4.2', 'Lantai 4'),
('location-19', 'Ruang 4.3', 'Lantai 4'),
('location-20', 'Ruang 4.4', 'Lantai 4'),
('location-21', 'Ruang 4.5', 'Lantai 4'),
('location-22', 'Ruang 4.6', 'Lantai 4'),
('location-23', 'Ruang 4.7', 'Lantai 4'),
('location-24', 'Ruang 4.8', 'Lantai 4'),
('location-25', 'Working Space Lantai 1', 'Area bersama'),
('location-26', 'Working Space Lantai 2', 'Area bersama'),
('location-27', 'Working Space Lantai 3', 'Area bersama'),
('location-28', 'Working Space Lantai 4', 'Area bersama'),
('location-29', 'Lobi Gedung JTI', 'Area bersama'),
('location-30', 'Koridor Gedung JTI', 'Area bersama'),
('location-31', 'Toilet Lantai 2', 'Sanitasi'),
('location-32', 'Toilet Lantai 3', 'Sanitasi'),
('location-33', 'Toilet Lantai 4', 'Sanitasi'),
('location-34', 'Teras Gedung JTI', 'Area luar'),
('location-35', 'Parkir JTI', 'Area luar'),
('location-36', 'Selasar Gedung JTI', 'Area luar');
--> statement-breakpoint
INSERT INTO "facility_objects" ("id", "name", "group_name") VALUES
('object-1', 'AC', 'Perangkat'),
('object-2', 'LCD', 'Perangkat'),
('object-3', 'TV', 'Perangkat'),
('object-4', 'Lampu', 'Perangkat'),
('object-5', 'Meja', 'Furnitur'),
('object-6', 'Kursi', 'Furnitur'),
('object-7', 'Keran air', 'Sanitasi'),
('object-8', 'Wastafel', 'Sanitasi'),
('object-9', 'Kloset', 'Sanitasi');
--> statement-breakpoint
INSERT INTO "services" ("id", "name") VALUES
('service-1', 'JTI Surat'),
('service-2', 'JTI Ruang Baca'),
('service-3', 'JTI Evaluasi Pembelajaran'),
('service-4', 'JTI E-Learning'),
('service-5', 'Administrasi'),
('service-6', 'Keamanan'),
('service-7', 'Kebersihan');
