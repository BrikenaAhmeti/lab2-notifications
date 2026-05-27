import { Router } from 'express';

import { env } from '../../../config/env';
import { NodemailerEmailService } from '../../../infrastructure/email/email.service';
import { prisma } from '../../../infrastructure/db/prisma';
import { authenticate } from '../../../shared/middleware/authenticate';
import { requireInternalApiKey } from '../../../shared/middleware/internal-api-key';
import { activityService } from '../../dashboard/presentation/dashboard.routes';
import { NotificationService } from '../application/notification.service';
import { PrismaNotificationRepository } from '../infrastructure/notification.prisma.repository';
import { NotificationController } from './notification.controller';

const repository = new PrismaNotificationRepository(prisma);
const emailService = new NodemailerEmailService();
export const notificationService = new NotificationService(
    repository,
    emailService,
    env.mongoUrl ? activityService : undefined,
);
const controller = new NotificationController(notificationService);

export const notificationRoutes = Router();
export const internalNotificationRoutes = Router();

internalNotificationRoutes.post('/send', requireInternalApiKey, controller.send);

notificationRoutes.get('/', authenticate, controller.listMine);
notificationRoutes.put('/read-all', authenticate, controller.markAllRead);
notificationRoutes.put('/:id/read', authenticate, controller.markRead);
notificationRoutes.delete('/:id', authenticate, controller.delete);
