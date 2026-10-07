-- Add REJECTED_TASK / FAILED_TASK discriminators to the CreditReason enum
-- so rejected/failed task credit reconciliation is auditable and distinct
-- from a generic cancel refund (spec §24 / T2).

ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'REJECTED_TASK';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'FAILED_TASK';
