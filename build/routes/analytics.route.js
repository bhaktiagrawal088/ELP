"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlerware/auth");
const analytics_controller_1 = require("../controllers/analytics.controller");
const analayticsRouter = express_1.default.Router();
analayticsRouter.get("/get-users-analytics", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getUsersAnalytics);
analayticsRouter.get("/get-courses-analytics", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getCoursesAnalytics);
analayticsRouter.get("/get-orders-analytics", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), analytics_controller_1.getOrdersAnalytics);
exports.default = analayticsRouter;
