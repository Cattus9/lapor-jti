-- Use the same catalog lock as report submission and Management edits.
SELECT pg_advisory_xact_lock(748193);
--> statement-breakpoint
-- Retire only the original placeholder classrooms still in their original area.
-- Keep their IDs and facility links for reports and catalog history.
UPDATE "locations" AS room
SET "is_active" = false, "revision" = room."revision" + 1
FROM (VALUES
  ('location-20', 'Ruang 4.4'),
  ('location-21', 'Ruang 4.5'),
  ('location-22', 'Ruang 4.6'),
  ('location-23', 'Ruang 4.7'),
  ('location-24', 'Ruang 4.8')
) AS placeholder(id, name)
WHERE room."id" = placeholder.id
  AND room."name" = placeholder.name
  AND room."area_id" = 'floor-4'
  AND room."is_active";
