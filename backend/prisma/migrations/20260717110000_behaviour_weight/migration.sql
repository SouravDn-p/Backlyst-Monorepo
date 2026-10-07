-- Spec P5b (T3): ranking weight for the behaviourScore signal.
-- Adds behaviourWeight to MarketplaceScoringConfig so the already-computed
-- behaviourScore can be consumed as a ranking signal (default 0.05 to keep
-- existing ordering only mildly affected).

ALTER TABLE "MarketplaceScoringConfig" ADD COLUMN "behaviourWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05;
