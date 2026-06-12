"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const notification_gateway_1 = require("../../../socket/notification.gateway");
const app_error_1 = require("../../../shared/core/errors/app-error");
const activity_event_projector_1 = require("../domain/activity-event-projector");
class ActivityService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    list(input) {
        return this.repository.list(input);
    }
    async record(input) {
        const activity = await this.repository.create(input);
        notification_gateway_1.notificationGateway.emitActivityNew(activity);
        return activity;
    }
    async recordDomainEvent(input) {
        const activity = (0, activity_event_projector_1.projectActivityFromDomainEvent)(input);
        if (!activity) {
            throw new app_error_1.AppError(`${input.type} is not supported for dashboard activity`, 422);
        }
        return this.record(activity);
    }
    async recordNotificationEvent(input) {
        const activity = (0, activity_event_projector_1.projectActivityFromDomainEvent)(input);
        if (!activity) {
            return null;
        }
        return this.record(activity);
    }
}
exports.ActivityService = ActivityService;
