import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import ErrorHandler from "../utlis/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utlis/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utlis/sendMail";
import NotificationModel from "../models/notificationModel";
import axios from "axios";

// upload course
export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        // Save Cloudinary URL and public_id
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      // Pass data to service for creating course
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// edit course++
export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      const courseId = req.params.id;
      const courseData = (await CourseModel.findById(courseId)) as any;

      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }
      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      await redis.set(courseId, JSON.stringify(course), "EX", 604800); // expire after 7 days

      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course  - withour purchasing (anyone can access)

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      // this is becasue to reduce the traffic
      const isCacheExit = await redis.get(courseId);
      // console.log("Hitting Redis");
      if (isCacheExit) {
        const course = JSON.parse(isCacheExit);
        res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        // console.log("Hitting moongodb");

        await redis.set(courseId, JSON.stringify(course), "EX", 604800); // After 7 days user login again to maintain our cache data

        res.status(201).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all course -without purchasing
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
      const courses = await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      // console.log("Hiiting moongodb");

      await redis.set("allCourses", JSON.stringify(courses));

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get course content- onlt for valid user
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      // console.log(courseId);

      const courseExits = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!courseExits) {
        return next(
          new ErrorHandler("This course is not accessible to you", 404)
        );
      }

      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add questions in course

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      // create a new question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      // add this question to our course content
      courseContent.questions.push(newQuestion);

      await NotificationModel.create({
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add answer in course question

interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData =
        req.body;
      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }

      // create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
      };

      //add this answer to our course content
      question.questionReplies?.push(newAnswer);

      await course?.save();

      if (req.user?._id === question.user._id) {
        // create a notification
        await NotificationModel.create({
          user: req.user?._id,
          title: "New Question Reply Received",
          message: `You have a new question reply in ${courseContent.title}`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: question.user.email,
            subject: "Question-Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReviewData {
  userId: string;
  review: string;
  rating: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      // check if the courseId already exist in courseList
      const courseExit = userCourseList?.some(
        (course: any) => course._id.toString() === courseId.toString()
      );

      if (!courseExit) {
        return next(
          new ErrorHandler("you are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);
      const { rating, review } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };

      course?.reviews.push(reviewData);

      let avg = 0;
      course?.reviews.forEach((rev: any) => {
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;
      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const review = course?.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );

      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }

      const replyData: any = {
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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all courses --- only for admin
export const getAdminAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// delete course --- only for admin

export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      await course.deleteOne({ id });

      await redis.del(id);

      res.status(201).json({
        success: true,
        message: "Course delete successfully ",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// generate video url
export const generateVideoUrl = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// import { Request, Response, NextFunction } from "express";
// import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
// import ErrorHandler from "../utlis/ErrorHandler";
// import cloudinary from "cloudinary";
// import { createCourse, getAllCoursesService } from "../services/course.service";
// import CourseModel from "../models/course.model";
// import { redis } from "../utlis/redis";
// import mongoose from "mongoose";
// import ejs from "ejs";
// import path from "path";
// import sendMail from "../utlis/sendMail";
// import NotificationModel from "../models/notificationModel";
// import axios from "axios";

// // upload course
// export const uploadCourse = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const data = req.body;
//       const thumbnail = data.thumbnail;

//       // Validate if thumbnail is a string (URL or base64)
//       // if (thumbnail && typeof thumbnail !== "string" && thumbnail.startsWith("data:")) {
//       //   return next(
//       //     new ErrorHandler("Thumbnail must be a valid string (URL or base64).", 400)
//       //   );
//       // }

//       // If thumbnail is an object (file), upload to Cloudinary
//       if (thumbnail) {
//         // const myCloud = await cloudinary.v2.uploader.upload(thumbnail.path, {
//           const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
//           folder: "courses",
//         });

//         // Save Cloudinary URL and public_id
//         data.thumbnail = {
//           public_id: myCloud.public_id,
//           url: myCloud.secure_url,
//         };
//       }

//       // Pass data to service for creating course
//       createCourse(data, res, next);
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   }
// );

// // export const uploadCourse = CatchAsyncError(
// //   async (req: Request, res: Response, next: NextFunction) => {
// //     try {
// //       const data = req.body;
// //       const thumbnail = data.thumbnail;

// //       // Case 1: Base64 string → upload to Cloudinary
// //       if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("data:")) {
// //         const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
// //           folder: "courses",
// //         });

// //         data.thumbnail = {
// //           public_id: myCloud.public_id,
// //           url: myCloud.secure_url,
// //         };
// //       }

// //       // Case 2: Already an object { public_id, url } → keep as is
// //       else if (thumbnail && typeof thumbnail === "object" && thumbnail.url) {
// //         data.thumbnail = thumbnail;
// //       }

// //       // Case 3: Invalid thumbnail
// //       else if (thumbnail && typeof thumbnail !== "string") {
// //         return next(new ErrorHandler("Thumbnail must be a valid base64 string or object.", 400));
// //       }

// //       // Save / Update course
// //       createCourse(data, res, next);
// //     } catch (error: any) {
// //       return next(new ErrorHandler(error.message, 500));
// //     }
// //   }
// // );

// // edit course
// export const editCourse  = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {
//     const data = req.body;
//     const thumbnail = data.thumbnail;

//     if(thumbnail){
//       await cloudinary.v2.uploader.destroy(thumbnail.public_id);

//       const myCloud = await cloudinary.v2.uploader.upload(thumbnail,{
//         folder:"courses",
//       })

//       data.thumbnail = {
//         public_id: myCloud.public_id,
//         url : myCloud.url,
//       }
//     }

//     const courseId = req.params.id;
//     const course = await CourseModel.findByIdAndUpdate(courseId,{
//       $set : data},
//       {new : true,
//     });

//     res.status(201).json({
//       success: true,
//       course,
//     })

//   } catch (error : any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// });

// // get single course  - withour purchasing (anyone can access)

// export const getSingleCourse = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {

//     const courseId  = req.params.id;

//     // this is becasue to reduce the traffic
//     const isCacheExit = await redis.get(courseId);
//     // console.log("Hitting Redis");
//     if(isCacheExit){
//       const course = JSON.parse(isCacheExit);
//       res.status(200).json({
//         success: true,
//         course,
//       })
//     }

//    else{
//         const course = await CourseModel.findById(req.params.id).select('-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links');

//         // console.log("Hitting moongodb");

//         await redis.set(courseId, JSON.stringify(course), "EX", 604800); // After 7 days user login again to maintain our cache data

//         res.status(201).json({
//            success: true,
//            course,
//     })
//    }

//   } catch (error : any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// });

// // get all course -without purchasing
// export const getAllCourses = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {

//     // const isCacheExit = await redis.get("allCourses");
//     // if(isCacheExit){
//     //   const courses = JSON.parse(isCacheExit);
//     //   // console.log("Hitting redis");
//     //   res.status(200).json({
//     //     success: true,
//     //     courses,
//     //   })
//     // }

//     //   else{
//         const courses = await CourseModel.find().select('-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links');

//         // console.log("Hiiting moongodb");

//         // await redis.set("allCourses", JSON.stringify(courses));

//           res.status(200).json({
//             success: true,
//             courses,
//           })

//       }catch (error : any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// }
// )

// // get course content- onlt for valid user
// export const getCourseByUser = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {
//     const userCourseList = req.user?.courses;
//     const courseId = req.params.id;
//     // console.log(courseId);

//     const courseExits = userCourseList?.find((course:any) =>course._id.toString() === courseId)

//     if(!courseExits){
//       return next(new ErrorHandler("You are not eligible foe this course", 404));
//     }

//     const course = await CourseModel.findById(courseId);
//     const content = course?.courseData;

//     res.status(200).json({
//       success: true,
//       content,
//     })

//   } catch (error : any) {
//     return next(new ErrorHandler(error.message, 500));

//   }
// });

// // add questions in course

// interface IAddQuestionData{
//   question: string,
//   courseId : string,
//   contentId: string,
// }

// export const addQuestion = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {
//     const {question, courseId, contentId} : IAddQuestionData = req.body;
//     const course  = await CourseModel.findById(courseId);

//      if(!mongoose.Types.ObjectId.isValid(contentId)){
//         return next(new ErrorHandler("Invalid content id", 400));
//      }

//      const courseContent = course?.courseData.find((item:any) => item._id.equals(contentId))
//      if(!courseContent){
//       return next(new ErrorHandler("Invalid content id" , 400));
//      }

//      // create a new question object
//      const newQuestion:any = {
//         user:req.user,
//         question,
//         questionReplies:[],
//      };

//      // add this question to our course content
//      courseContent.questions.push(newQuestion);

//      await NotificationModel.create({
//       user: req.user?._id,
//       title : "New Question Received",
//       message: `You have a new question in ${courseContent.title}`

//      })
//      // save the update course
//      await course?.save();

//      res.status(200).json({
//       success: true,
//       course,
//      })
//   } catch (error:any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// });

// // add answer in course question

// interface IAddAnswerData {
//   answer : string,
//   courseId :  string,
//   contentId : string,
//   questionId : string,
// }

// export const addAnswer = CatchAsyncError(async(req:Request, res: Response, next:NextFunction) => {
//   try {
//     const {answer, courseId, contentId, questionId} : IAddAnswerData = req.body;
//     const course = await CourseModel.findById(courseId);

//     if(!mongoose.Types.ObjectId.isValid(contentId)){
//       return next(new ErrorHandler("Invalid content id", 400));
//    }

//    const courseContent = course?.courseData.find((item:any) => item._id.equals(contentId))

//    if(!courseContent){
//     return next(new ErrorHandler("Invalid content id" , 400));
//    }

//    const question = courseContent?.questions?.find((item:any) => item._id.equals(questionId))

//    if(!question){
//       return next(new ErrorHandler("Invalid question id", 400));
//    }

//    // create a new answer object
//    const newAnswer: any  = {
//       user: req.user,
//       answer,
//    }

//    //add this answer to our course content
//    question.questionReplies?.push(newAnswer);

//    await course?.save();

//    if(req.user?._id === question.user._id){
//     // create a notification
//     await NotificationModel.create({
//       user: req.user?._id,
//       title : "New Question Reply Received",
//       message : `You have a new question reply in ${courseContent.title}`,
//     })
//    }
//    else{
//     const data = {
//       name: question.user.name,
//       title: courseContent.title,
//     }

//     const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"),
//        data);

//    try {
//     await sendMail({
//       email: question.user.email,
//       subject : "Question-Reply",
//       template : "question-reply.ejs",
//       data,
//     })

//       } catch (error:any) {
//           return next(new ErrorHandler(error.message, 400));
//       }
//    }

//    res.status(200).json({
//     success: true,
//     course,
//    })

//   } catch (error: any) {
//     return next(new ErrorHandler(error.message, 500));

//   }
// });

// interface IAddReviewData  {
//     userId: string,
//     review: string,
//     rating : string,
// }

// export const addReview = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//     try {
//       const userCourseList = req.user?.courses;
//       const courseId = req.params.id;

//       // check if the courseId already exist in courseList
//       const courseExit = userCourseList?.some((course:any) => course._id.toString() === courseId.toString());

//       if(!courseExit){
//         return next(new ErrorHandler("you are not eligible to access this course", 404));
//       }

//       const course = await CourseModel.findById(courseId);
//       const{rating, review} = req.body as IAddReviewData;

//       const reviewData : any = {
//         user: req.user,
//         comment: review,
//         rating,
//       }

//       course?.reviews.push(reviewData);

//       let avg = 0 ;
//       course?.reviews.forEach((rev:any) =>{
//         avg += rev.rating;
//       })
//       if(course){
//         course.ratings = avg / course.reviews.length;
//       }
//       // Example
//       // if we have 2 users then user1 gave ratings 5 and user2 gave the rating 4
//       // then total rating is 9 and users are 2 so 9/2 => 4.5 ratings

//       await course?.save();

//       const notification = {
//         title : "New Review Received",
//         message : `${req.user?.name} has given a review in ${course?.name}`,
//       }

//       // create notification

//       res.status(200).json({
//         success: true,
//         course,
//       })

//     } catch (error:any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
// });

// interface IAddReviewData {
//   comment : string,
//   courseId : string,
//   reviewId : string,
// }

// export const addReplyToReview = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {
//     const {comment, courseId, reviewId} = req.body as IAddReviewData;
//     const course = await CourseModel.findById(courseId);

//     if(!course){
//       return next(new ErrorHandler("Course not found", 404));
//     }

//     const review = course?.reviews?.find((rev:any) => rev._id.toString() === reviewId)

//     if(!review){
//       return next(new ErrorHandler("Review not found", 404));
//     }

//     const replyData:any = {
//       user: req.user,
//       comment
//     }

//     if(!review.commentReplies){
//       review.commentReplies = [];
//     }

//     review.commentReplies?.push(replyData);

//     await course?.save();

//     res.status(200).json({
//       success : true,
//       course,
//     })

//   } catch (error:any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// });

// // get all courses --- only for admin
// // export const getAllUsers = CatchAsyncError(
// export const getAdminAllCourses = CatchAsyncError(
//   async(req:Request, res:Response, next:NextFunction) => {
//   try {
//       getAllCoursesService(res);
//   } catch (error : any) {
//       return next(new ErrorHandler(error.message, 500));

//   }
// });

// // delete course --- only for admin

// export const deleteCourse = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {
//   try {

//     const {id} = req.params;

//     const course = await CourseModel.findById(id);
//     if(!course){
//       return next(new ErrorHandler("Course not found", 404));
//     }

//     await course.deleteOne({id})

//     await redis.del(id);

//     res.status(201).json({
//       success: true,
//       message : "Course delete successfully "
//     })

//   } catch (error: any) {
//     return next(new ErrorHandler(error.message,500));
//   }
// })

// // generate video url
// export const generateVideoUrl = CatchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
//   try {
//     const {videoId} = req.body;
//     const response = await axios.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`,
//       {ttl : 300},{
//         headers : {
//           Accept  : 'application/json',
//           "Content-Type" : 'application/json',
//           Authorization : `Apisecret ${process.env.VDOCIPHER_API_SECRET}`
//         }
//       }
//     )
//     res.json(response.data)
//   } catch (error : any) {
//     return next(new ErrorHandler(error.message, 400))
//   }
// })