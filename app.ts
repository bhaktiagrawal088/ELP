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
import express, { NextFunction, Request, Response } from "express";
export const app = express();

import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middlerware/error";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import userRouter from "./routes/user.route";
import notificationRoute from "./routes/notification.route";
import analayticsRouter from "./routes/analytics.route";
import layoutRouter from "./routes/layout.route";
import rateLimit from "express-rate-limit";


/* ----------------------------------------------------------
   🔥 FIX: MUST BE THE FIRST MIDDLEWARE (BEFORE CORS)
   Handles OPTIONS correctly and prevents redirections
----------------------------------------------------------- */
app.use((req, res, next) => {
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
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://www.liveenglishwithsushil.com"
    ],
    credentials: true,
}));

/* ----------------------------------------------------------
   Cookie + Body Parser
----------------------------------------------------------- */
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

/* ----------------------------------------------------------
   Rate Limiter
----------------------------------------------------------- */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

/* ----------------------------------------------------------
   Routes
----------------------------------------------------------- */
app.use("/api/v1", userRouter, courseRouter);
app.use("/api/v1", orderRouter, notificationRoute);
app.use("/api/v1", analayticsRouter, layoutRouter);
app.use("/api/v1", orderRouter);

app.get("/test", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

/* ----------------------------------------------------------
   Unknown Route Handler
----------------------------------------------------------- */
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

/* ----------------------------------------------------------
   Error Middleware
----------------------------------------------------------- */
app.use(ErrorMiddleware);

