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
import { ExpoPushNotificationService } from '../infrastructure/expo-push-notification.service';
import { PrismaPushTokenRepository } from '../infrastructure/push-token.prisma.repository';

const repository = new PrismaNotificationRepository(prisma);
const pushTokenRepository = new PrismaPushTokenRepository(prisma);
const pushNotificationService = new ExpoPushNotificationService(pushTokenRepository);
const emailService = new NodemailerEmailService();
export const notificationService = new NotificationService(
    repository,
    emailService,
    env.mongoUrl ? activityService : undefined,
    pushTokenRepository,
    pushNotificationService,
);
const controller = new NotificationController(notificationService);

export const notificationRoutes = Router();
export const internalNotificationRoutes = Router();

internalNotificationRoutes.post('/send', requireInternalApiKey, controller.send);

notificationRoutes.get('/', authenticate, controller.listMine);
notificationRoutes.post('/push-tokens', authenticate, controller.registerPushToken);
notificationRoutes.delete('/push-tokens', authenticate, controller.unregisterPushToken);
notificationRoutes.post('/push-test', authenticate, controller.testPush);
notificationRoutes.put('/read-all', authenticate, controller.markAllRead);
notificationRoutes.put('/:id/read', authenticate, controller.markRead);
notificationRoutes.delete('/:id', authenticate, controller.delete);
