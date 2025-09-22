"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotification = exports.getNotification = void 0;
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const node_cron_1 = __importDefault(require("node-cron"));
// get all notifications  - only admin
exports.getNotification = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const notifications = await notificationModel_1.default.find().sort({ createdAt: -1 });
        res.status(201).json({
            success: true,
            notifications,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// update notification status - only admin
exports.updateNotification = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const notification = await notificationModel_1.default.findById(req.params.id);
        if (!notification) {
            return next(new ErrorHandler_1.default("Notification not found", 404));
        }
        else {
            notification.status ? notification.status = 'read' : notification.status;
        }
        await notification.save();
        //update our frontend status
        const notifications = await notificationModel_1.default.find().sort({ createdAt: -1 });
        res.status(201).json({
            success: true,
            notifications,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// delete a notification -- only admin
// cron.schedule("*/5 * * * * *",function(){  // call after 5 second
//     console.log("____________");
//     console.log("Running cron");
// })
node_cron_1.default.schedule("0 0 0 * * *", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 100);
    await notificationModel_1.default.deleteMany({ status: "read", createAt: { $lt: thirtyDaysAgo } });
    // console.log('Delete read notification');
});
