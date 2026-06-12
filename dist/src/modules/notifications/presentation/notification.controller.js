"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const app_error_1 = require("../../../shared/core/errors/app-error");
const notification_schemas_1 = require("./notification.schemas");
class NotificationController {
    notificationService;
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    send = async (req, res, next) => {
        try {
            const payload = notification_schemas_1.sendNotificationSchema.parse(req.body);
            if ('recipients' in payload) {
                const result = await this.notificationService.sendTyped(payload);
                return res.status(201).json({ data: result });
            }
            const notification = await this.notificationService.create(payload);
            return res.status(201).json({ data: notification });
        }
        catch (error) {
            return next(error);
        }
    };
    listMine = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const query = notification_schemas_1.listNotificationsQuerySchema.parse(req.query);
            const result = await this.notificationService.list({
                userId: user.id,
                isRead: query.isRead,
                page: query.page,
                limit: query.limit,
            });
            return res.json(result);
        }
        catch (error) {
            return next(error);
        }
    };
    markRead = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { id } = notification_schemas_1.notificationIdParamsSchema.parse(req.params);
            const notification = await this.notificationService.markRead(id, user.id);
            return res.json({ data: notification });
        }
        catch (error) {
            return next(error);
        }
    };
    markAllRead = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const result = await this.notificationService.markAllRead(user.id);
            return res.json({ data: result });
        }
        catch (error) {
            return next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { id } = notification_schemas_1.notificationIdParamsSchema.parse(req.params);
            await this.notificationService.delete(id, user.id);
            return res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    registerPushToken = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const payload = notification_schemas_1.registerPushTokenSchema.parse(req.body);
            await this.notificationService.registerPushToken({
                userId: user.id,
                ...payload,
            });
            return res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    unregisterPushToken = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { token } = notification_schemas_1.unregisterPushTokenSchema.parse(req.body);
            await this.notificationService.unregisterPushToken(user.id, token);
            return res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    testPush = async (req, res, next) => {
        try {
            const user = this.getUser(req);
            const { delaySeconds } = notification_schemas_1.testPushSchema.parse(req.body);
            this.notificationService.scheduleTestPush(user.id, delaySeconds);
            return res.status(202).json({ data: { delaySeconds } });
        }
        catch (error) {
            return next(error);
        }
    };
    getUser(req) {
        if (!req.user) {
            throw new app_error_1.AppError('Authentication required', 401);
        }
        return req.user;
    }
}
exports.NotificationController = NotificationController;
