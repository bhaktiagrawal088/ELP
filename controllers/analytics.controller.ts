import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utlis/ErrorHandler";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import { generateLast12MonthsData } from "../utlis/analytics.generator";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/orderModel";


// get users analaytics --- only for admin
export const getUsersAnalytics = CatchAsyncError(async(req:Request, res:Response, next: NextFunction) => {
    try {
        const users = await generateLast12MonthsData(userModel);

        res.status(201).json({
            success: true,
            users,
        })
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));
        
    }
});

// get courses analytics --- only for admin

export const getCoursesAnalytics = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
    try {
        const courses = await generateLast12MonthsData(CourseModel);

        res.status(201).json({
            success: true,
            courses,
        })
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get orders analytics --- only for admin

export const getOrdersAnalytics = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
    try {

        const orders = await generateLast12MonthsData(OrderModel);

        res.status(201).json({
            success: true,
            orders,
        })
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));
    }
})
