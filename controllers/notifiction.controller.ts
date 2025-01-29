import NotificationModel from "../models/notificationModel";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import ErrorHandler from "../utlis/ErrorHandler";

// get all notifications  - only admin
export const getNotification = CatchAsyncError(async(req: Request, res:Response, next:NextFunction) =>{
    try {
        const notifications = await NotificationModel.find().sort({createdAt: -1});

        res.status(201).json({
            success: true,
            notifications,
        })
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// update notification status - only admin
export const updateNotification = CatchAsyncError(async(req:Request, res:Response, next: NextFunction) => {
    try {
        const notification = await NotificationModel.findById(req.params.id);

        if(!notification){
            return next(new ErrorHandler("Notification not found", 404));
        }
        else{
            notification.status ? notification.status = 'read' : notification.status;
        }

        await notification.save();


        //update our frontend status

        const notifications = await NotificationModel.find().sort({createdAt : -1});

        res.status(201).json({
            success: true,
            notifications,
        })
        
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})