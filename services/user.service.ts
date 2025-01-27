
import { NextFunction, Response } from "express";
import ErrorHandler from "../utlis/ErrorHandler";
import { redis } from "../utlis/redis";


// get user by id

export const getUserById = async (id:string, res:Response, next: NextFunction) => {
    try {
        const userJson = await redis.get(id);

        if(userJson){
            const user  = JSON.parse(userJson);
            
            if (!user) {
                return next(new ErrorHandler("User not found", 404));
            }
            res.status(201).json({
                success: true,
                user,
            })
        }

       
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 500));

    }
    
}