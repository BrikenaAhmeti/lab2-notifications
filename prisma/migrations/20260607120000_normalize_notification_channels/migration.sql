CREATE TABLE "notification_channels" (
    "notification_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("notification_id", "channel")
);

INSERT INTO "notification_channels" ("notification_id", "channel")
SELECT DISTINCT n."id", channels."channel"
FROM "notifications" n
CROSS JOIN LATERAL unnest(n."channels") AS channels("channel");

ALTER TABLE "notifications"
    DROP COLUMN "channels";

CREATE INDEX "notification_channels_channel_idx"
    ON "notification_channels"("channel");

ALTER TABLE "notification_channels"
    ADD CONSTRAINT "notification_channels_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "notifications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
