ALTER TABLE "reports" DROP CONSTRAINT "reports_status_category_check";--> statement-breakpoint
-- Only active Satpam verification states are retired. Preserve original
-- timestamps, audit history, notifications and every other role's lifecycle.
UPDATE "reports" SET "status" = 'diproses'
WHERE "category" = 'kehilangan-temuan' AND "handler_role" = 'satpam'
  AND "status" = 'diverifikasi';--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_status_category_check" CHECK ("reports"."status" in ('baru', 'diproses', 'selesai', 'ditolak') or ("reports"."category" = 'fasilitas' and "reports"."status" = 'diverifikasi') or ("reports"."category" = 'kehilangan-temuan' and "reports"."status" in ('barang_teridentifikasi', 'diserahkan')));
