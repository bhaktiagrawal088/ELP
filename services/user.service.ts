
import { NextFunction, Response } from "express";
import ErrorHandler from "../utlis/ErrorHandler";
import { redis } from "../utlis/redis";
import userModel from "../models/user.model";


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

// Get All user
export const getAllUsersService = async (res:Response) => {
    const users = await userModel.find().sort({createAt : -1});

    res.status(201).json({
        success: true,
        users,
    })
}

// update user role

export const updateUserRoleService = async(res:Response, id: string, role:string) => {
    const user = await userModel.findByIdAndUpdate(id,{role},{new:true});

    res.status(201).json({
        success : true,
        user
    })
}