import { Response } from "express";
import CourseModel from "../models/course.model";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";

// create course
export const createCourse = CatchAsyncError(async(data: any, res:Response) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
        success: true,
        course,
    });
})


// get All course 
export const getAllCoursesService = async(res:Response) => {
    const courses =await CourseModel.find().sort({createAt : -1});

    res.status(201).json({
        success: true,
        courses,
    })
}