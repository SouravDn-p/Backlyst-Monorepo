/*
  Warnings:
  - You are about to add 3 foreign key constraints to existing tables.
    The current rows in `RiskEvent` and `ManualMatchQueue` must reference existing
    parent rows in `Website`/`PlacementTask`, or the constraints will fail to apply.

  - Changing the schema of a production database is a risky operation. Please
    confirm the migration is correct before applying.
*/

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualMatchQueue" ADD CONSTRAINT "ManualMatchQueue_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlacementTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualMatchQueue" ADD CONSTRAINT "ManualMatchQueue_providerWebsiteId_fkey" FOREIGN KEY ("providerWebsiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualMatchQueue" ADD CONSTRAINT "ManualMatchQueue_requesterWebsiteId_fkey" FOREIGN KEY ("requesterWebsiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
