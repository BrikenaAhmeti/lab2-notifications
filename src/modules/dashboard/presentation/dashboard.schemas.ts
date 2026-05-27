import { z } from 'zod';

import { activityDomainEventTypes } from '../domain/activity-event-projector';

export const listActivityQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const recordActivityEventSchema = z
    .object({
        type: z.enum(activityDomainEventTypes),
        data: z.record(z.string(), z.unknown()).default({}),
        occurredAt: z.coerce.date().optional(),
    })
    .strict();
