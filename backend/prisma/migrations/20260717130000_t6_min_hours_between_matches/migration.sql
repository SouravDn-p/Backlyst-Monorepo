-- Spec T6: strict inter-match spacing (in addition to the existing daily cap).
-- A profile may be configured with a minimum number of hours that must elapse
-- between consecutive applications (minHoursBetweenMatches). The timestamp of
-- the last successful application is recorded on lastApplicationAt; a new
-- application within the window is rejected by ValidationEngine. A default of
-- 0 preserves the current daily-cap-only behaviour.

ALTER TABLE "WebsiteMatchingProfile"
  ADD COLUMN "lastApplicationAt" TIMESTAMP;
ALTER TABLE "WebsiteMatchingProfile"
  ADD COLUMN "minHoursBetweenMatches" INTEGER NOT NULL DEFAULT 0;
