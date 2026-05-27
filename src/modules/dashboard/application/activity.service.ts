import { notificationGateway } from '../../../socket/notification.gateway';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    ActivityStreamItem,
    ListActivityInput,
    PaginatedActivityStream,
    PersistActivityInput,
} from '../domain/activity.entity';
import {
    ActivityDomainEventInput,
    projectActivityFromDomainEvent,
} from '../domain/activity-event-projector';
import { ActivityRepository } from '../domain/activity.repository';

export class ActivityService {
    constructor(private readonly repository: ActivityRepository) {}

    list(input: ListActivityInput): Promise<PaginatedActivityStream> {
        return this.repository.list(input);
    }

    async record(input: PersistActivityInput): Promise<ActivityStreamItem> {
        const activity = await this.repository.create(input);
        notificationGateway.emitActivityNew(activity);

        return activity;
    }

    async recordDomainEvent(input: ActivityDomainEventInput): Promise<ActivityStreamItem> {
        const activity = projectActivityFromDomainEvent(input);

        if (!activity) {
            throw new AppError(`${input.type} is not supported for dashboard activity`, 422);
        }

        return this.record(activity);
    }

    async recordNotificationEvent(input: ActivityDomainEventInput): Promise<ActivityStreamItem | null> {
        const activity = projectActivityFromDomainEvent(input);

        if (!activity) {
            return null;
        }

        return this.record(activity);
    }
}
