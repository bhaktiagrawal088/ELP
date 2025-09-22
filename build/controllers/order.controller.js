"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utlis/sendMail"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const order_service_1 = require("../services/order.service");
// create order
exports.createOrder = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { courseId, payment_info } = req.body;
        const user = await user_model_1.default.findById(req.user?._id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        // const courseExistInUser =  user?.courses.some((course:any) => course._id.toString() === courseId);
        const courseExistInUser = user?.courses.some((c) => c.courseId === courseId);
        if (courseExistInUser) {
            return next(new ErrorHandler_1.default("You have already purchased this course", 400));
        }
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        const data = {
            courseId: course._id,
            userId: user._id,
            payment_info,
        };
        const mailData = {
            order: {
                // _id : course._id.slice(0,6),
                _id: course._id.toString().slice(0, 6), // Assert the type to ObjectId and then call toString()
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            }
        };
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });
        try {
            if (user) {
                await (0, sendMail_1.default)({
                    email: user.email,
                    subject: "Order-confimation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                });
            }
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 500));
        }
        // user?.courses.push(course?._id);
        user?.courses.push({ courseId: (course?._id).toString() });
        await user.save(); // Save changes to the database
        const notification = await notificationModel_1.default.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order ${course?.name}`
        });
        // course.purchased ? course.purchased += 1 : course.purchased;
        await course_model_1.default.findByIdAndUpdate(courseId, { $inc: { purchased: 1 } }, { new: true });
        await course.save();
        (0, order_service_1.newOrder)(data, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get all order -- only for admin
exports.getAllOrders = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, order_service_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// sent stripe publishie key
exports.sendStripePublishableKey = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res) => {
    res.status(200).json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});
