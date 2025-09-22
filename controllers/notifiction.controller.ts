import NotificationModel from "../models/notificationModel";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import ErrorHandler from "../utlis/ErrorHandler";
import cron from 'node-cron'

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

// delete a notification -- only admin



// cron.schedule("*/5 * * * * *",function(){  // call after 5 second
//     console.log("____________");
//     console.log("Running cron");
// })


cron.schedule("0 0 0 * * *",async() => { // call everyday at midnight
    const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 100);
    await NotificationModel.deleteMany({status : "read", createAt : {$lt : thirtyDaysAgo}});
    // console.log('Delete read notification');
})