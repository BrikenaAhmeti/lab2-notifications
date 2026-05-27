import { NextFunction, Request, Response } from 'express';

import { ActivityService } from '../application/activity.service';
import {
    listActivityQuerySchema,
    recordActivityEventSchema,
} from './dashboard.schemas';

export class DashboardController {
    constructor(private readonly activityService: ActivityService) {}

    listActivity = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = listActivityQuerySchema.parse(req.query);
            const result = await this.activityService.list(query);

            return res.json(result);
        } catch (error) {
            return next(error);
        }
    };

    recordActivityEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const payload = recordActivityEventSchema.parse(req.body);
            const activity = await this.activityService.recordDomainEvent(payload);

            return res.status(201).json({ data: activity });
        } catch (error) {
            return next(error);
        }
    };
}
