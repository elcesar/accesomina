-- Calendar-only fields remain DATE/ISO YYYY-MM-DD. Instants remain timestamptz.
-- New entries retain the company operational IANA zone used at registration.
ALTER TABLE work_book_entries
  ADD COLUMN IF NOT EXISTS operational_time_zone text;

ALTER TABLE work_book_entries
  ADD CONSTRAINT work_book_entries_operational_time_zone_length
  CHECK (operational_time_zone IS NULL OR char_length(operational_time_zone) BETWEEN 1 AND 64);
