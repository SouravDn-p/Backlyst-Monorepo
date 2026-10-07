-- AlterTable
ALTER TABLE "CreditLog" ADD COLUMN     "directTaskRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "CreditLog" ADD CONSTRAINT "CreditLog_directTaskRequestId_fkey" FOREIGN KEY ("directTaskRequestId") REFERENCES "DirectTaskRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
