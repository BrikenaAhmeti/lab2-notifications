"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_schemas_1 = require("./dashboard.schemas");
class DashboardController {
    activityService;
    constructor(activityService) {
        this.activityService = activityService;
    }
    listActivity = async (req, res, next) => {
        try {
            const query = dashboard_schemas_1.listActivityQuerySchema.parse(req.query);
            const result = await this.activityService.list(query);
            return res.json(result);
        }
        catch (error) {
            return next(error);
        }
    };
    recordActivityEvent = async (req, res, next) => {
        try {
            const payload = dashboard_schemas_1.recordActivityEventSchema.parse(req.body);
            const activity = await this.activityService.recordDomainEvent(payload);
            return res.status(201).json({ data: activity });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.DashboardController = DashboardController;
