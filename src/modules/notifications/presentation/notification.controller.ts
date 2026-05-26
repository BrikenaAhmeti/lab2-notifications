import { NextFunction, Request, Response } from 'express';

import { AppError } from '../../../shared/core/errors/app-error';
import { AuthenticatedUser } from '../../../shared/core/types/request-with-user';
import { NotificationService } from '../application/notification.service';
import {
    listNotificationsQuerySchema,
    notificationIdParamsSchema,
    sendNotificationSchema,
} from './notification.schemas';

export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    send = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const payload = sendNotificationSchema.parse(req.body);

            if ('recipients' in payload) {
                const result = await this.notificationService.sendTyped(payload);

                return res.status(201).json({ data: result });
            }

            const notification = await this.notificationService.create(payload);

            return res.status(201).json({ data: notification });
        } catch (error) {
            return next(error);
        }
    };

    listMine = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const query = listNotificationsQuerySchema.parse(req.query);
            const result = await this.notificationService.list({
                userId: user.id,
                isRead: query.isRead,
                page: query.page,
                limit: query.limit,
            });

            return res.json(result);
        } catch (error) {
            return next(error);
        }
    };

    markRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { id } = notificationIdParamsSchema.parse(req.params);
            const notification = await this.notificationService.markRead(id, user.id);

            return res.json({ data: notification });
        } catch (error) {
            return next(error);
        }
    };

    markAllRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const result = await this.notificationService.markAllRead(user.id);

            return res.json({ data: result });
        } catch (error) {
            return next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.getUser(req);
            const { id } = notificationIdParamsSchema.parse(req.params);
            await this.notificationService.delete(id, user.id);

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    };

    private getUser(req: Request): AuthenticatedUser {
        if (!req.user) {
            throw new AppError('Authentication required', 401);
        }

        return req.user;
    }
}
