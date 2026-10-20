ALTER TABLE "reports" DROP CONSTRAINT "reports_handler_category_check";--> statement-breakpoint
-- Replace this small enum transactionally: the migrator runs all statements in
-- one transaction, where ADD VALUE followed by using 'tefa' would be unsafe.
ALTER TYPE "public"."report_handler" RENAME TO "report_handler_before_tefa";--> statement-breakpoint
CREATE TYPE "public"."report_handler" AS ENUM ('satpam', 'teknisi', 'manajemen', 'tefa');--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "handler_role" TYPE "public"."report_handler" USING "handler_role"::text::"public"."report_handler";--> statement-breakpoint
DROP TYPE "public"."report_handler_before_tefa";--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "handler_role" text DEFAULT 'manajemen' NOT NULL;--> statement-breakpoint
CREATE INDEX "report_service_details_service_report_idx" ON "report_service_details" USING btree ("service_id","report_id");--> statement-breakpoint
CREATE INDEX "services_handler_active_idx" ON "services" USING btree ("handler_role","is_active","id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_handler_category_check" CHECK (("reports"."category" = 'kehilangan-temuan' and "reports"."handler_role" = 'satpam') or ("reports"."category" = 'fasilitas' and "reports"."handler_role" = 'teknisi') or ("reports"."category" = 'layanan' and "reports"."handler_role" in ('manajemen', 'tefa')) or ("reports"."category" = 'lainnya' and "reports"."handler_role" = 'manajemen'));--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_handler_check" CHECK ("services"."handler_role" in ('manajemen', 'tefa'));
--> statement-breakpoint
-- Stable IDs from the original catalog. Preserve all report ownership/history.
UPDATE "services" SET "handler_role" = 'tefa', "revision" = "revision" + 1
WHERE "id" IN ('service-1', 'service-2', 'service-3', 'service-4');
