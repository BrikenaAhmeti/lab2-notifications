import { Router } from 'express';

import { getMongoDb } from '../../../infrastructure/mongo/mongo';
import { authenticate } from '../../../shared/middleware/authenticate';
import { requireInternalApiKey } from '../../../shared/middleware/internal-api-key';
import { ActivityService } from '../application/activity.service';
import { MongoActivityRepository } from '../infrastructure/mongo-activity.repository';
import { DashboardController } from './dashboard.controller';

const repository = new MongoActivityRepository(getMongoDb);
export const activityService = new ActivityService(repository);
const controller = new DashboardController(activityService);

export const dashboardRoutes = Router();
export const internalDashboardRoutes = Router();

dashboardRoutes.get('/activity', authenticate, controller.listActivity);
internalDashboardRoutes.post('/activity', requireInternalApiKey, controller.recordActivityEvent);
