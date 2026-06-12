"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordActivityEventSchema = exports.listActivityQuerySchema = void 0;
const zod_1 = require("zod");
const activity_event_projector_1 = require("../domain/activity-event-projector");
exports.listActivityQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.recordActivityEventSchema = zod_1.z
    .object({
    type: zod_1.z.enum(activity_event_projector_1.activityDomainEventTypes),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    occurredAt: zod_1.z.coerce.date().optional(),
})
    .strict();
