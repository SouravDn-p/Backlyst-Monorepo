-- Reciprocal Rules audit (2026-07-18) follow-ups.
-- Addresses partially-implemented requirements R2/R9/R11 (data-driven public
-- suffix list; complete + revocable override audit trail). The rest of the
-- audit's service-layer work is applied in code (see task notes).
--
-- NOTE: this migration is hand-authored because `prisma migrate dev` fails
-- against a stale shadow database (pre-existing P3006 desync in
-- 20260718130000_domain_relationship_tracking). The real database already has
-- all prior migrations applied; this migration only adds net-new objects.

-- 1. Data-driven public-suffix list (audit R2 / R14). Replaces the previously
--    hardcoded TWO_PART_PUBLIC_SUFFIXES set in root-domain-normalizer.util.ts.
CREATE TABLE "PublicSuffixList" (
    "id" TEXT NOT NULL,
    "suffix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSuffixList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicSuffixList_suffix_key" ON "PublicSuffixList"("suffix");
CREATE INDEX "PublicSuffixList_isActive_idx" ON "PublicSuffixList"("isActive");

-- Seed the existing two-part suffixes so normalisation is unchanged at deploy.
INSERT INTO "PublicSuffixList" ("id", "suffix", "isActive", "note", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'ac.uk',    true, 'UK academic',        now(), now()),
    (gen_random_uuid()::text, 'co.bd',    true, 'Bangladesh commercial', now(), now()),
    (gen_random_uuid()::text, 'co.in',    true, 'India commercial',   now(), now()),
    (gen_random_uuid()::text, 'co.jp',    true, 'Japan commercial',   now(), now()),
    (gen_random_uuid()::text, 'co.nz',    true, 'New Zealand commercial', now(), now()),
    (gen_random_uuid()::text, 'co.uk',    true, 'UK commercial',      now(), now()),
    (gen_random_uuid()::text, 'com.au',   true, 'Australia commercial', now(), now()),
    (gen_random_uuid()::text, 'com.bd',   true, 'Bangladesh commercial', now(), now()),
    (gen_random_uuid()::text, 'com.br',   true, 'Brazil commercial',  now(), now()),
    (gen_random_uuid()::text, 'com.cn',   true, 'China commercial',   now(), now()),
    (gen_random_uuid()::text, 'com.sg',   true, 'Singapore commercial', now(), now()),
    (gen_random_uuid()::text, 'gov.uk',   true, 'UK government',      now(), now()),
    (gen_random_uuid()::text, 'net.au',   true, 'Australia network',  now(), now()),
    (gen_random_uuid()::text, 'org.uk',   true, 'UK org',             now(), now());

-- 2. MarketplaceOverrideAudit: affectedDomains + expiry/revocation (audit R9/R11).
--    Previously only provider websiteId was captured, so the requester domain of
--    a reciprocal override was lost, and overrides could not be revoked/expired.
ALTER TABLE "MarketplaceOverrideAudit"
    ADD COLUMN "affectedDomains" TEXT[],
    ADD COLUMN "expiresAt" TIMESTAMP(3),
    ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE INDEX "MarketplaceOverrideAudit_rule_idx" ON "MarketplaceOverrideAudit"("rule");
CREATE INDEX "MarketplaceOverrideAudit_affectedDomains_idx" ON "MarketplaceOverrideAudit" USING GIN ("affectedDomains");
