require('dotenv').config();
import express, { NextFunction , Request, Response } from "express";
export const app = express();
import cors from 'cors';
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middlerware/error";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import userRouter from "./routes/user.route";
import notificationRoute from "./routes/notification.route";
import analayticsRouter from "./routes/analytics.route";
import layoutRouter from "./routes/layout.route";
import rateLimit  from "express-rate-limit";


//body parser
app.use(express.json({limit: "50mb"}));

// cookie parser
app.use(cookieParser());

//cors => cross origin  resource sharing
app.use(cors({
    // origin: process.env.ORIGIN
    origin : ['http://localhost:3000', 'https://elp-nu.vercel.app'],
    credentials: true,
}))

// api request limit
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` 
	standardHeaders: true, 
	legacyHeaders: false, 
})

app.use(limiter)

//routes
app.use("/api/v1", userRouter, courseRouter);
app.use("/api/v1", orderRouter, notificationRoute);
app.use("/api/v1", analayticsRouter, layoutRouter);

// testing api
app.get("/test", (req: Request, res:Response, next:NextFunction) => {
    res.status(200).json({
        success : true,
        message : "API is working"
    })
})

// unknown route
app.all("*",(req: Request, res:Response, next:NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
})

// middleware calls
app.use(ErrorMiddleware);

