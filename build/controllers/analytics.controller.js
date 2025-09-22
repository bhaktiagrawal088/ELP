"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersAnalytics = exports.getCoursesAnalytics = exports.getUsersAnalytics = void 0;
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const analytics_generator_1 = require("../utlis/analytics.generator");
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const orderModel_1 = __importDefault(require("../models/orderModel"));
// get users analaytics --- only for admin
exports.getUsersAnalytics = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const users = await (0, analytics_generator_1.generateLast12MonthsData)(user_model_1.default);
        res.status(201).json({
            success: true,
            users,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get courses analytics --- only for admin
exports.getCoursesAnalytics = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courses = await (0, analytics_generator_1.generateLast12MonthsData)(course_model_1.default);
        res.status(201).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get orders analytics --- only for admin
exports.getOrdersAnalytics = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const orders = await (0, analytics_generator_1.generateLast12MonthsData)(orderModel_1.default);
        res.status(201).json({
            success: true,
            orders,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
