DROP INDEX "notifications_recipient_date_idx";--> statement-breakpoint
DROP INDEX "reports_reporter_date_idx";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "report_attachments" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "report_attachments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "report_drafts" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "report_drafts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "report_drafts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "report_drafts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "report_status_history" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "report_status_history" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "submitted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "completed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "reports_reporter_updated_idx" ON "reports" USING btree ("reporter_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_date_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_reporter_date_idx" ON "reports" USING btree ("reporter_id","submitted_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_handler_category_check" CHECK (("reports"."category" = 'kehilangan-temuan' and "reports"."handler_role" = 'satpam') or ("reports"."category" = 'fasilitas' and "reports"."handler_role" = 'teknisi') or ("reports"."category" in ('layanan', 'lainnya') and "reports"."handler_role" = 'manajemen'));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_status_category_check" CHECK ("reports"."status" in ('baru', 'diproses', 'selesai', 'ditolak') or ("reports"."category" in ('kehilangan-temuan', 'fasilitas') and "reports"."status" = 'diverifikasi') or ("reports"."category" = 'kehilangan-temuan' and "reports"."status" in ('barang_teridentifikasi', 'diserahkan')));