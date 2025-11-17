-- Add currentPeriodStart to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" DATE;

-- Create UsageRecord table for tracking subscription usage
CREATE TABLE "usage_records" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "subscription_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "metric_name" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(15, 4) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_usage_records_subscription"
        FOREIGN KEY ("subscription_id")
        REFERENCES "subscriptions"("id")
        ON DELETE CASCADE,

    CONSTRAINT "fk_usage_records_user"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX "idx_usage_records_subscription_timestamp"
    ON "usage_records"("subscription_id", "timestamp" DESC);

CREATE INDEX "idx_usage_records_user_metric_timestamp"
    ON "usage_records"("user_id", "metric_name", "timestamp" DESC);

CREATE INDEX "idx_usage_records_metric_timestamp"
    ON "usage_records"("metric_name", "timestamp" DESC);

CREATE INDEX "idx_usage_records_timestamp"
    ON "usage_records"("timestamp" DESC);

-- Update existing subscriptions to populate current_period_start
-- This assumes monthly billing cycle - adjust dates based on your billing cycles
UPDATE "subscriptions"
SET "current_period_start" = "current_period_end" - INTERVAL '1 month'
WHERE "current_period_start" IS NULL;

-- Add comment to the table
COMMENT ON TABLE "usage_records" IS 'Tracks usage metrics for subscription billing and monitoring';
COMMENT ON COLUMN "usage_records"."metric_name" IS 'The type of usage metric (e.g., api_calls, storage_mb, whatsapp_messages)';
COMMENT ON COLUMN "usage_records"."quantity" IS 'The amount of usage recorded';
COMMENT ON COLUMN "usage_records"."metadata" IS 'Additional JSON metadata about the usage event';
