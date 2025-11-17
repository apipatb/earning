-- AlterEnum: Add new values to EmailStatus
ALTER TYPE "EmailStatus" ADD VALUE 'OPENED';
ALTER TYPE "EmailStatus" ADD VALUE 'UNSUBSCRIBED';

-- AlterEnum: Add new values to WhatsAppContactStatus
ALTER TYPE "WhatsAppContactStatus" ADD VALUE 'INACTIVE';
ALTER TYPE "WhatsAppContactStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum: Add new value to WhatsAppMessageStatus
ALTER TYPE "WhatsAppMessageStatus" ADD VALUE 'PENDING';

-- AlterEnum: Replace WebhookEventType values
-- Note: This is a breaking change. Old webhook event types will be replaced with new dotted notation.
-- First, create a temporary enum with new values
CREATE TYPE "WebhookEventType_new" AS ENUM (
  'user.created',
  'user.updated',
  'user.deleted',
  'ticket.created',
  'ticket.updated',
  'ticket.closed',
  'payment.received',
  'payment.failed',
  'invoice.created',
  'invoice.paid',
  'report.generated',
  'notification.sent',
  'email.delivered'
);

-- Migrate existing data (map old values to new where possible)
-- Note: Some old event types don't have direct mappings to the new schema
-- You may need to handle these manually based on your business logic
ALTER TABLE "webhook_events" ALTER COLUMN "event_type" DROP DEFAULT;

-- For backward compatibility, map similar event types:
-- INVOICE_CREATED -> invoice.created
-- INVOICE_PAID -> invoice.paid
UPDATE "webhook_events" SET "event_type" = 'invoice.created'::text WHERE "event_type"::text = 'INVOICE_CREATED';
UPDATE "webhook_events" SET "event_type" = 'invoice.paid'::text WHERE "event_type"::text = 'INVOICE_PAID';

-- For unmapped events, you might want to log them or handle them differently
-- For now, we'll set them to 'notification.sent' as a catch-all
-- You may want to customize this based on your needs
UPDATE "webhook_events" SET "event_type" = 'notification.sent'::text
WHERE "event_type"::text NOT IN ('invoice.created', 'invoice.paid');

-- Drop the old enum and rename the new one
ALTER TABLE "webhook_events" ALTER COLUMN "event_type" TYPE "WebhookEventType_new" USING ("event_type"::text::"WebhookEventType_new");
DROP TYPE "WebhookEventType";
ALTER TYPE "WebhookEventType_new" RENAME TO "WebhookEventType";

-- AlterTable: Change default value for WhatsAppMessage status
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" SET DEFAULT 'PENDING';
