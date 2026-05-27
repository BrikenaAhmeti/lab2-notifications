import {
    ActivityStreamItem,
    ListActivityInput,
    PaginatedActivityStream,
    PersistActivityInput,
} from './activity.entity';

export interface ActivityRepository {
    create(input: PersistActivityInput): Promise<ActivityStreamItem>;
    list(input: ListActivityInput): Promise<PaginatedActivityStream>;
}
