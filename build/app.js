"use strict";
// require('dotenv').config();
// import express, { NextFunction , Request, Response } from "express";
// export const app = express();
// import cors from 'cors';
// import cookieParser from "cookie-parser";
// import { ErrorMiddleware } from "./middlerware/error";
// import courseRouter from "./routes/course.route";
// import orderRouter from "./routes/order.route";
// import userRouter from "./routes/user.route";
// import notificationRoute from "./routes/notification.route";
// import analayticsRouter from "./routes/analytics.route";
// import layoutRouter from "./routes/layout.route";
// import rateLimit  from "express-rate-limit";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// //cors => cross origin  resource sharing
// app.use(cors({
//     // origin: process.env.ORIGIN
//     origin : ['http://localhost:3000', 'https://liveenglishwithsushil.com' ,'https://www.liveenglishwithsushil.com'],
//     credentials: true,
// }))
// // cookie parser
// app.use(cookieParser());
// //body parser
// app.use(express.json({limit: "50mb"}));
// // api request limit
// const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000, // 15 minutes
// 	limit: 100, // Limit each IP to 100 requests per `window` 
// 	standardHeaders: true, 
// 	legacyHeaders: false, 
// })
// app.use(limiter)
// //routes
// app.use("/api/v1", userRouter, courseRouter);
// app.use("/api/v1", orderRouter, notificationRoute);
// app.use("/api/v1", analayticsRouter, layoutRouter);
// // testing api
// app.get("/test", (req: Request, res:Response, next:NextFunction) => {
//     res.status(200).json({
//         success : true,
//         message : "API is working"
//     })
// })
// // unknown route
// app.all("*",(req: Request, res:Response, next:NextFunction) => {
//     const err = new Error(`Route ${req.originalUrl} not found`) as any;
//     err.statusCode = 404;
//     next(err);
// })
// // middleware calls
// app.use(ErrorMiddleware);
require('dotenv').config();
const express_1 = __importDefault(require("express"));
exports.app = (0, express_1.default)();
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const error_1 = require("./middlerware/error");
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/* ----------------------------------------------------------
   🔥 FIX: MUST BE THE FIRST MIDDLEWARE (BEFORE CORS)
   Handles OPTIONS correctly and prevents redirections
----------------------------------------------------------- */
exports.app.use((req, res, next) => {
    // Stop ALL redirects for preflight requests
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        return res.sendStatus(200);
    }
    next();
});
/* ----------------------------------------------------------
   CORS
----------------------------------------------------------- */
exports.app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://liveenglishwithsushil.com",
        "https://www.liveenglishwithsushil.com"
    ],
    credentials: true,
}));
/* ----------------------------------------------------------
   Cookie + Body Parser
----------------------------------------------------------- */
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: "50mb" }));
/* ----------------------------------------------------------
   Rate Limiter
----------------------------------------------------------- */
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
exports.app.use(limiter);
/* ----------------------------------------------------------
   Routes
----------------------------------------------------------- */
exports.app.use("/api/v1", user_route_1.default, course_route_1.default);
exports.app.use("/api/v1", order_route_1.default, notification_route_1.default);
exports.app.use("/api/v1", analytics_route_1.default, layout_route_1.default);
exports.app.get("/test", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});
/* ----------------------------------------------------------
   Unknown Route Handler
----------------------------------------------------------- */
exports.app.all("*", (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
});
/* ----------------------------------------------------------
   Error Middleware
----------------------------------------------------------- */
exports.app.use(error_1.ErrorMiddleware);
