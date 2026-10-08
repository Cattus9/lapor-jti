CREATE TABLE "location_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "location_areas_name_unique" UNIQUE("name"),
	CONSTRAINT "location_area_kind_check" CHECK ("location_areas"."kind" in ('floor', 'area'))
);
--> statement-breakpoint
CREATE TABLE "location_facility_objects" (
	"location_id" text NOT NULL,
	"object_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facility_objects" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "area_id" text;--> statement-breakpoint
-- Backfill explicit floor names without guessing floors for lobbies/corridors.
INSERT INTO "location_areas" ("id", "name", "kind", "sort_order") VALUES
('floor-1', 'Lantai 1', 'floor', 1), ('floor-2', 'Lantai 2', 'floor', 2),
('floor-3', 'Lantai 3', 'floor', 3), ('floor-4', 'Lantai 4', 'floor', 4);
--> statement-breakpoint
UPDATE "locations" SET "area_id" = 'floor-' || substring("name" from 'Lantai ([1-4])') WHERE "name" ~ 'Lantai [1-4]';
--> statement-breakpoint
UPDATE "locations" SET "area_id" = 'floor-' || substring("group_name" from '^Lantai ([1-4])$') WHERE "area_id" IS NULL AND "group_name" ~ '^Lantai [1-4]$';
--> statement-breakpoint
INSERT INTO "location_areas" ("id", "name", "kind", "sort_order")
SELECT 'area-' || md5("group_name"), "group_name", 'area', 10 FROM "locations" WHERE "area_id" IS NULL GROUP BY "group_name";
--> statement-breakpoint
UPDATE "locations" SET "area_id" = 'area-' || md5("group_name") WHERE "area_id" IS NULL;
--> statement-breakpoint
UPDATE "locations" l SET "group_name" = a."name" FROM "location_areas" a WHERE l."area_id" = a."id";
--> statement-breakpoint
ALTER TABLE "locations" ALTER COLUMN "area_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "security_officers" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Initial editable mapping for the original catalog, not a verified physical inventory.
-- New/custom rooms start empty; Management reviews and assigns their facilities.
INSERT INTO "location_facility_objects" ("location_id", "object_id")
SELECT l."id", o."id" FROM "locations" l CROSS JOIN "facility_objects" o
WHERE l."id" ~ '^location-[0-9]+$' AND o."id" ~ '^object-[1-9]$' AND (
  (l."name" LIKE 'Toilet Lantai %' AND o."name" IN ('Lampu', 'Keran air', 'Wastafel', 'Kloset')) OR
  ((l."name" LIKE 'Lab %' OR l."name" LIKE 'Ruang %') AND o."name" IN ('AC', 'LCD', 'TV', 'Lampu', 'Meja', 'Kursi')) OR
  (l."name" LIKE 'Working Space Lantai %' AND o."name" IN ('Lampu', 'Meja', 'Kursi')) OR
  (l."name" IN ('Lobi Gedung JTI', 'Koridor Gedung JTI', 'Teras Gedung JTI', 'Parkir JTI', 'Selasar Gedung JTI') AND o."name" = 'Lampu')
);--> statement-breakpoint
ALTER TABLE "location_facility_objects" ADD CONSTRAINT "location_facility_objects_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_facility_objects" ADD CONSTRAINT "location_facility_objects_object_id_facility_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."facility_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_audit" ADD CONSTRAINT "operational_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "location_areas_name_lower_unique" ON "location_areas" USING btree (lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "location_facility_object_unique" ON "location_facility_objects" USING btree ("location_id","object_id");--> statement-breakpoint
CREATE INDEX "location_facility_object_reverse_idx" ON "location_facility_objects" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "operational_audit_entity_date_idx" ON "operational_audit" USING btree ("entity","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "operational_audit_actor_date_idx" ON "operational_audit" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_area_id_location_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."location_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_objects_name_lower_unique" ON "facility_objects" USING btree (lower(trim("name")));--> statement-breakpoint
CREATE INDEX "locations_area_active_idx" ON "locations" USING btree ("area_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_name_lower_unique" ON "locations" USING btree (lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "services_name_lower_unique" ON "services" USING btree (lower(trim("name")));
