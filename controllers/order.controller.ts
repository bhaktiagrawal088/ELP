import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import ErrorHandler from "../utlis/ErrorHandler";
import OrderModel, {IOrder} from "../models/orderModel";
import userModel from "../models/user.model";
import CourseModel , {ICourse}  from "../models/course.model";
import path from "path";
import ejs from "ejs";
// import {sendMail} from "../utlis/sendMail";
const { sendMail } = require("../utlis/sendMail");

import NotificationModel from "../models/notificationModel";
import { getAllOrdersService, newOrder } from "../services/order.service";
import mongoose from "mongoose";


// create order
export const createOrder = CatchAsyncError(async(req:Request, res:Response,next : NextFunction) => {
    try {
        const {courseId , payment_info} = req.body as IOrder;

        const user = await userModel.findById(req.user?._id);


        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }


        // const courseExistInUser =  user?.courses.some((course:any) => course._id.toString() === courseId);
        const courseExistInUser = user?.courses.some(
            (c: { courseId: string }) => c.courseId === courseId
        );
        
        

        if(courseExistInUser){
            return next(new ErrorHandler("You have already purchased this course" , 400));
        }

        const course: ICourse | null = await CourseModel.findById(courseId);


        if(!course){
            return next(new ErrorHandler("Course not found", 404));
        }

        const data: any = {
            courseId : course._id,
            userId : user._id,
            payment_info,
        };


        const mailData = {
            order : {
                // _id : course._id.slice(0,6),
                _id: (course._id as mongoose.Types.ObjectId).toString().slice(0, 6), // Assert the type to ObjectId and then call toString()
                name: course.name,
                price : course.price,
                date : new Date().toLocaleDateString('en-US', {year : 'numeric', month: 'long', day : 'numeric'}),

            }
        }

        const html = await ejs.renderFile(path.join(__dirname, "../mails/order-confirmation.ejs"), {order:mailData});

        try {
            if(user){
                await sendMail({
                    email : user.email,
                    subject : "Order-confimation",
                    template : "order-confirmation.ejs",
                    data : mailData,
                })
            }
            
        } catch (error : any) {
            return next(new ErrorHandler(error.message, 500));
        }

        // user?.courses.push(course?._id);
        user?.courses.push({ courseId: (course?._id as mongoose.Types.ObjectId).toString() });
        await user.save(); // Save changes to the database


        const notification = await NotificationModel.create({
            user:user?._id,
            title : "New Order",
            message : `You have a new order ${course?.name}`
        })


        // course.purchased ? course.purchased += 1 : course.purchased;
        await CourseModel.findByIdAndUpdate(courseId, { $inc: { purchased: 1 } }, { new: true });

        await course.save();


        newOrder(data, res, next);



       
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500))
    }

    
});

// get all order -- only for admin

export const getAllOrders = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
    try {
        getAllOrdersService(res);
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// sent stripe publishie key
export const sendStripePublishableKey = CatchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
); 