-- The old workflow recorded delivery and closed the pair in separate actions.
-- Only pairs with a recorded handover and both reports awaiting closure qualify.
WITH completed_matches AS (
  UPDATE lost_found_matches AS match
  SET completed_at = greatest(
    transaction_timestamp()::timestamptz(3),
    match.matched_at,
    handover.handed_over_at + interval '1 millisecond'
  )
  FROM report_handovers AS handover, reports AS loss, reports AS found
  WHERE handover.match_id = match.id
    AND loss.id = match.loss_report_id
    AND found.id = match.found_report_id
    AND match.completed_at IS NULL
    AND loss.category = 'kehilangan-temuan' AND loss.handler_role = 'satpam'
    AND found.category = 'kehilangan-temuan' AND found.handler_role = 'satpam'
    AND loss.status = 'diserahkan' AND found.status = 'diserahkan'
  RETURNING match.loss_report_id, match.found_report_id, match.completed_at,
    handover.actor_id, handover.actor_name
), completed_reports AS (
  UPDATE reports AS report
  SET status = 'selesai',
    completed_at = match.completed_at,
    updated_at = greatest(report.updated_at, match.completed_at)
  FROM completed_matches AS match
  WHERE report.id IN (match.loss_report_id, match.found_report_id)
  RETURNING report.id, report.completed_at, match.actor_id, match.actor_name
)
INSERT INTO report_status_history (
  report_id, actor_id, actor_name, from_status, to_status, note, created_at
)
SELECT id, actor_id, actor_name, 'diserahkan', 'selesai',
  'Laporan ditutup otomatis berdasarkan catatan penyerahan terdahulu.', completed_at
FROM completed_reports
WHERE actor_id IS NOT NULL;
