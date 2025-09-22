"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoUrl = exports.deleteCourse = exports.getAdminAllCourses = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addQuestion = exports.getCourseByUser = exports.getAllCourses = exports.getSingleCourse = exports.editCourse = exports.uploadCourse = void 0;
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const course_service_1 = require("../services/course.service");
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utlis/redis");
const mongoose_1 = __importDefault(require("mongoose"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utlis/sendMail"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const axios_1 = __importDefault(require("axios"));
// upload course
exports.uploadCourse = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        // Validate if thumbnail is a string (URL or base64)
        // if (thumbnail && typeof thumbnail !== "string") {
        //   return next(
        //     new ErrorHandler("Thumbnail must be a valid string (URL or base64).", 400)
        //   );
        // }
        // If thumbnail is an object (file), upload to Cloudinary
        // if (thumbnail && typeof thumbnail === "object" && thumbnail.path) {
        if (thumbnail) {
            // const myCloud = await cloudinary.v2.uploader.upload(thumbnail.path, {
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            // Save Cloudinary URL and public_id
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        // Pass data to service for creating course
        (0, course_service_1.createCourse)(data, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// edit course++
exports.editCourse = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = (await course_model_1.default.findById(courseId));
        if (thumbnail && !thumbnail.startsWith("https")) {
            if (courseData?.thumbnail?.public_id) {
                await cloudinary_1.default.v2.uploader.destroy(courseData.thumbnail.public_id);
            }
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        if (thumbnail && thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData?.thumbnail.public_id,
                url: courseData?.thumbnail.url,
            };
        }
        const course = await course_model_1.default.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });
        await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800); // expire after 7 days
        res.status(201).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get single course  - withour purchasing (anyone can access)
exports.getSingleCourse = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courseId = req.params.id;
        // this is becasue to reduce the traffic
        const isCacheExit = await redis_1.redis.get(courseId);
        // console.log("Hitting Redis");
        if (isCacheExit) {
            const course = JSON.parse(isCacheExit);
            res.status(200).json({
                success: true,
                course,
            });
        }
        else {
            const course = await course_model_1.default.findById(req.params.id).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            // console.log("Hitting moongodb");
            await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800); // After 7 days user login again to maintain our cache data
            res.status(201).json({
                success: true,
                course,
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get all course -without purchasing
exports.getAllCourses = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        // const isCacheExit = await redis.get("allCourses");
        // if(isCacheExit){
        //   const courses = JSON.parse(isCacheExit);
        //   // console.log("Hitting redis");
        //   res.status(200).json({
        //     success: true,
        //     courses,
        //   })
        // }
        //   else{
        const courses = await course_model_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        // console.log("Hiiting moongodb");
        await redis_1.redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get course content- onlt for valid user
exports.getCourseByUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;
        // console.log(courseId);
        const courseExits = userCourseList?.find((course) => course._id.toString() === courseId);
        if (!courseExits) {
            return next(new ErrorHandler_1.default("This course is not accessible to you", 404));
        }
        const course = await course_model_1.default.findById(courseId);
        const content = course?.courseData;
        res.status(200).json({
            success: true,
            content,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addQuestion = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { question, courseId, contentId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const courseContent = course?.courseData.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        // create a new question object
        const newQuestion = {
            user: req.user,
            question,
            questionReplies: [],
        };
        // add this question to our course content
        courseContent.questions.push(newQuestion);
        await notificationModel_1.default.create({
            user: req.user?._id,
            title: "New Question Received",
            message: `You have a new question in ${courseContent.title}`,
        });
        // save the update course
        await course?.save();
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addAnswer = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { answer, courseId, contentId, questionId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const courseContent = course?.courseData.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const question = courseContent?.questions?.find((item) => item._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler_1.default("Invalid question id", 400));
        }
        // create a new answer object
        const newAnswer = {
            user: req.user,
            answer,
        };
        //add this answer to our course content
        question.questionReplies?.push(newAnswer);
        await course?.save();
        if (req.user?._id === question.user._id) {
            // create a notification
            await notificationModel_1.default.create({
                user: req.user?._id,
                title: "New Question Reply Received",
                message: `You have a new question reply in ${courseContent.title}`,
            });
        }
        else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
            };
            const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/question-reply.ejs"), data);
            try {
                await (0, sendMail_1.default)({
                    email: question.user.email,
                    subject: "Question-Reply",
                    template: "question-reply.ejs",
                    data,
                });
            }
            catch (error) {
                return next(new ErrorHandler_1.default(error.message, 400));
            }
        }
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReview = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;
        // check if the courseId already exist in courseList
        const courseExit = userCourseList?.some((course) => course._id.toString() === courseId.toString());
        if (!courseExit) {
            return next(new ErrorHandler_1.default("you are not eligible to access this course", 404));
        }
        const course = await course_model_1.default.findById(courseId);
        const { rating, review } = req.body;
        const reviewData = {
            user: req.user,
            comment: review,
            rating,
        };
        course?.reviews.push(reviewData);
        let avg = 0;
        course?.reviews.forEach((rev) => {
            avg += rev.rating;
        });
        if (course) {
            course.ratings = avg / course.reviews.length;
        }
        // Example
        // if we have 2 users then user1 gave ratings 5 and user2 gave the rating 4
        // then total rating is 9 and users are 2 so 9/2 => 4.5 ratings
        await course?.save();
        const notification = {
            title: "New Review Received",
            message: `${req.user?.name} has given a review in ${course?.name}`,
        };
        // create notification
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReplyToReview = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { comment, courseId, reviewId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        const review = course?.reviews?.find((rev) => rev._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler_1.default("Review not found", 404));
        }
        const replyData = {
            user: req.user,
            comment,
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(replyData);
        await course?.save();
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get all courses --- only for admin
exports.getAdminAllCourses = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, course_service_1.getAllCoursesService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// delete course --- only for admin
exports.deleteCourse = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await course_model_1.default.findById(id);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        await course.deleteOne({ id });
        await redis_1.redis.del(id);
        res.status(201).json({
            success: true,
            message: "Course delete successfully ",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// generate video url
exports.generateVideoUrl = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { videoId } = req.body;
        const response = await axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
