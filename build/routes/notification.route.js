"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlerware/auth");
const notifiction_controller_1 = require("../controllers/notifiction.controller");
const user_controller_1 = require("../controllers/user.controller");
const notificationRoute = express_1.default.Router();
notificationRoute.get('/get-notifications', user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), notifiction_controller_1.getNotification);
notificationRoute.put('/update-notifications/:id', user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), notifiction_controller_1.updateNotification);
exports.default = notificationRoute;
