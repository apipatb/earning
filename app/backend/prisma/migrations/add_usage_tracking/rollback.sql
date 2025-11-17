-- Rollback script for add_usage_tracking migration
-- Run this if you need to undo the changes

-- Drop indexes first
DROP INDEX IF EXISTS "idx_usage_records_timestamp";
DROP INDEX IF EXISTS "idx_usage_records_metric_timestamp";
DROP INDEX IF EXISTS "idx_usage_records_user_metric_timestamp";
DROP INDEX IF EXISTS "idx_usage_records_subscription_timestamp";

-- Drop UsageRecord table
DROP TABLE IF EXISTS "usage_records";

-- Remove currentPeriodStart column from subscriptions
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "current_period_start";
