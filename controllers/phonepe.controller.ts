
// import axios from "axios";
// import crypto from "crypto";  // For optional checksum verification
// import { Request, Response } from "express";
// import OrderModel from "../models/orderModel";
// import userModel from "../models/user.model";
// import CourseModel from "../models/course.model";

// // Cache token
// let accessToken: string | null = null;
// let tokenExpiry: number = 0;

// // Fetch/refresh OAuth token (V2: Form-encoded body)
// const getAccessToken = async (): Promise<string> => {
//   if (accessToken && Date.now() < tokenExpiry) {
//     return accessToken;
//   }

//   try {
//     if (!process.env.PHONEPE_CLIENT_ID || !process.env.PHONEPE_CLIENT_SECRET || !process.env.PHONEPE_CLIENT_VERSION) {
//       throw new Error("Missing PhonePe credentials in environment");
//     }

//     const tokenResponse = await axios.post(
//       `${process.env.PHONEPE_BASE_URL}/v1/oauth/token`,
//       new URLSearchParams({
//         client_id: process.env.PHONEPE_CLIENT_ID!,
//         client_version: process.env.PHONEPE_CLIENT_VERSION!,  // '1' as string
//         client_secret: process.env.PHONEPE_CLIENT_SECRET!,
//         grant_type: "client_credentials",
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           "Accept": "application/json",
//         },
//       }
//     );

//     if (tokenResponse.data.access_token) {
//       accessToken = tokenResponse.data.access_token;
//       tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000) - 60000;
//       console.log("Token fetched successfully (expires:", new Date(tokenExpiry).toISOString(), ")");
//       return accessToken;
//     } else {
//       throw new Error("Invalid token response");
//     }
//   } catch (error: any) {
//     console.error("Token Error:", error.response?.data || error.message);
//     throw new Error(`Token fetch failed: ${error.response?.data?.message || error.message}`);
//   }
// };

// // 1. INITIATE PAYMENT (V2)
// export const initiatePayment = async (req: Request, res: Response) => {
//   try {
//     console.log("REQ BODY:", req.body);
//     console.log("USER:", req.user);
//     console.log("ENV:", {
//       clientId: process.env.PHONEPE_CLIENT_ID,
//       base: process.env.PHONEPE_BASE_URL,
//       redirect: process.env.PHONEPE_REDIRECT_URL,
//       callback: process.env.PHONEPE_CALLBACK_URL,
//     });

//     const { amount, courseId } = req.body;
//     if (!courseId) return res.status(400).json({ message: "courseId required" });

//     const course = await CourseModel.findById(courseId);
//     if (!course) return res.status(404).json({ message: "Course not found" });

//     const user = await userModel.findById(req.user?._id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const finalAmountInPaise = (amount ? parseInt(amount) : course.price) * 100;

//     const token = await getAccessToken();

//     const payload = {
//       merchantOrderId: "ORDER_" + Date.now(),
//       amount: finalAmountInPaise,
//       expireAfter: 1200,
//       metaInfo: {  // ✅ Fixed: Use udf1/udf2 for custom data
//         udf1: courseId,
//         udf2: req.user!._id.toString(),
//       },
//       paymentFlow: {
//         type: "PG_CHECKOUT",
//         message: "Pay for Course",
//         merchantUrls: {  // ✅ Added notifyUrl for S2S webhook
//           redirectUrl: process.env.PHONEPE_REDIRECT_URL!,
//           notifyUrl: process.env.PHONEPE_CALLBACK_URL!,
//         },
//       },
//     };

//     console.log("Payload to PhonePe:", JSON.stringify(payload, null, 2));  // Debug log

//     const phonepeResponse = await axios.post(
//       `${process.env.PHONEPE_BASE_URL}/checkout/v2/pay`,
//       payload,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "Accept": "application/json",
//           "Authorization": `O-Bearer ${token}`,
//         },
//       }
//     );

//     // ✅ No 'success' field; assume 200 OK is good
//     let redirectUrl = phonepeResponse.data.data?.instrumentResponse?.redirectInfo?.url ||
//                       phonepeResponse.data.data?.redirectUrl ||
//                       phonepeResponse.data.redirectUrl;
//     if (!redirectUrl) {
//       console.error("Full PhonePe Response:", JSON.stringify(phonepeResponse.data, null, 2));  // Debug
//       return res.status(500).json({ message: "Invalid redirect URL from PhonePe" });
//     }

//     return res.status(200).json({
//       success: true,
//       redirectUrl,
//       orderId: payload.merchantOrderId,
//     });
//   } catch (error: any) {
//     console.error("PhonePe Initiate Error:", error.response?.data || error.message);
//     return res.status(500).json({
//       success: false,
//       code: error.response?.data?.errorCode || "INTERNAL_ERROR",
//       message: error.response?.data?.message || error.message,
//     });
//   }
// };

// // 2. PHONEPE CALLBACK HANDLER (V2 Webhook)
// export const paymentCallback = async (req: Request, res: Response) => {
//   try {
//     const base64Payload = req.body.response;  // V2: 'response' is base64 string
//     if (!base64Payload) return res.status(400).send("Missing response payload");

//     const decodedPayload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
//     console.log("Decoded Callback Payload:", decodedPayload);

//     // Optional: Verify checksum (if salt provided in dashboard)
//     // const saltKey = process.env.PHONEPE_SALT_KEY!;  // Add to .env if available
//     // const stringToHash = base64Payload + `/pg/v1/status/${decodedPayload.merchantId}/${decodedPayload.merchantOrderId}` + saltKey;
//     // const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
//     // const expectedChecksum = sha256 + "###" + process.env.PHONEPE_SALT_INDEX;
//     // if (req.headers["x-verify"] !== expectedChecksum) return res.status(401).send("Invalid checksum");

//     const { merchantOrderId, state } = decodedPayload;

//     if (state === "COMPLETED") {
//       // ✅ Extract from udf1/udf2
//       const courseId = decodedPayload.metaInfo?.udf1;
//       const userId = decodedPayload.metaInfo?.udf2;
//       if (!courseId || !userId) {
//         console.error("Missing UDFs in callback");
//         return res.status(400).send("Invalid order data");
//       }

//       const user = await userModel.findById(userId);
//       if (user) {
//         user.courses.push({ _id: courseId });
//         await user.save();
//         console.log("Course added to user:", userId);
//       }

//       await OrderModel.create({
//         userId,
//         courseId,
//         payment_info: decodedPayload,
//       });

//       return res.status(200).send("OK");  // PhonePe expects "OK" or empty 200
//     }

//     console.log("Non-completed state:", state);
//     return res.status(200).send("OK");  // Acknowledge failures too
//   } catch (error: any) {
//     console.error("Callback Error:", error);
//     return res.status(500).send("ERROR");
//   }
// };

import axios from "axios";
import crypto from "crypto";  // For optional checksum verification
import {Request, Response } from "express";
import OrderModel from "../models/orderModel";
import userModel from "../models/user.model";
import CourseModel, { ICourse } from "../models/course.model";
import path from "path";
import ejs from "ejs";
const { sendMail } = require("../utlis/sendMail");
import NotificationModel from "../models/notificationModel";
import mongoose from "mongoose";
import { RequestHandler } from "express";


// Cache token
let accessToken: string | null = null;
let tokenExpiry: number = 0;


export type AuthRequestHandler<T = any> = RequestHandler<{}, any, T> & {
  user?: AuthUser;
};


export interface AuthUser {
  _id: mongoose.Types.ObjectId | string;
  email?: string;
  name?: string;
}
export type AuthRequest<T = any> = Request<{}, {}, T> & {
  user?: AuthUser;
};


// Fetch/refresh OAuth token (V2: Form-encoded body)
const getAccessToken = async (): Promise<string> => {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    if (!process.env.PHONEPE_CLIENT_ID || !process.env.PHONEPE_CLIENT_SECRET || !process.env.PHONEPE_CLIENT_VERSION) {
      throw new Error("Missing PhonePe credentials in environment");
    }

    const tokenResponse = await axios.post(
      `${process.env.PHONEPE_BASE_URL}/v1/oauth/token`,
      new URLSearchParams({
        client_id: process.env.PHONEPE_CLIENT_ID!,
        client_version: process.env.PHONEPE_CLIENT_VERSION!,
        client_secret: process.env.PHONEPE_CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
      }
    );

    if (tokenResponse.data.access_token) {
      accessToken = tokenResponse.data.access_token;
      tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000) - 60000;
      console.log("Token fetched successfully (expires:", new Date(tokenExpiry).toISOString(), ")");
      return accessToken ?? "";
    } else {
      throw new Error("Invalid token response");
    }
  } catch (error: any) {
    console.error("Token Error:", error.response?.data || error.message);
    throw new Error(`Token fetch failed: ${error.response?.data?.message || error.message}`);
  }
};

// 1. INITIATE PAYMENT (V2)
export const initiatePayment :AuthRequestHandler = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    console.log("USER:", req.user);
    console.log("ENV:", {
      clientId: process.env.PHONEPE_CLIENT_ID,
      base: process.env.PHONEPE_BASE_URL,
      redirect: process.env.PHONEPE_REDIRECT_URL,
      callback: process.env.PHONEPE_CALLBACK_URL,
    });

    const { amount, courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: "courseId required" });

    const course = await CourseModel.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const user = await userModel.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const finalAmountInPaise = (amount ? parseInt(amount) : course.price) * 100;

    const token = await getAccessToken();

    const payload = {
      merchantOrderId: "ORDER_" + Date.now(),
      amount: finalAmountInPaise,
      expireAfter: 1200,
      metaInfo: {
        udf1: courseId,
        // udf2: req.user!._id.toString() ,
        udf2: req.user!._id ? req.user!._id.toString() : "",
      },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Pay for Course",
        merchantUrls: {
          redirectUrl: process.env.PHONEPE_REDIRECT_URL!,
          notifyUrl: process.env.PHONEPE_CALLBACK_URL!,
        },
      },
    };

    console.log("Payload to PhonePe:", JSON.stringify(payload, null, 2));

    const phonepeResponse = await axios.post(
      `${process.env.PHONEPE_BASE_URL}/checkout/v2/pay`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `O-Bearer ${token}`,
        },
      }
    );

    let redirectUrl = phonepeResponse.data.data?.instrumentResponse?.redirectInfo?.url ||
                      phonepeResponse.data.data?.redirectUrl ||
                      phonepeResponse.data.redirectUrl;
    if (!redirectUrl) {
      console.error("Full PhonePe Response:", JSON.stringify(phonepeResponse.data, null, 2));
      return res.status(500).json({ message: "Invalid redirect URL from PhonePe" });
    }

    return res.status(200).json({
      success: true,
      redirectUrl,
      orderId: payload.merchantOrderId,
    });
  } catch (error: any) {
    console.error("PhonePe Initiate Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      code: error.response?.data?.errorCode || "INTERNAL_ERROR",
      message: error.response?.data?.message || error.message,
    });
  }
};

// 2. PHONEPE CALLBACK HANDLER (V2 Webhook)
export const paymentCallback : RequestHandler = async (req, res) => {
  try {
    const base64Payload = req.body?.response;
    if (!base64Payload) return res.status(400).send("Missing response payload");

    const decodedPayload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    console.log("Decoded Callback Payload:", decodedPayload);

    const { merchantOrderId, state } = decodedPayload;

    if (state === "COMPLETED") {
      const courseId = decodedPayload.metaInfo?.udf1;
      const userId = decodedPayload.metaInfo?.udf2;
      if (!courseId || !userId) {
        console.error("Missing UDFs in callback");
        return res.status(400).send("Invalid order data");
      }

      const user = await userModel.findById(userId);
      if (!user) {
        console.error("User not found in callback");
        return res.status(400).send("User not found");
      }

      // Check duplicate
      const courseExistInUser = user.courses.some(
        (c: { courseId: string }) => c.courseId === courseId
      );
      if (courseExistInUser) {
        console.log("Course already purchased; skipping");
        return res.status(200).send("OK");
      }

      // const course: ICourse | null = await CourseModel.findById(courseId);
      const course = await CourseModel.findById(courseId) as ICourse | null;

      if (!course) {
        console.error("Course not found in callback");
        return res.status(404).send("Course not found");
      }

      // Add course
      // user.courses.push({ courseId: course._id.toString() });
      // user.courses.push({ courseId: course._id.toString() });
      user.courses.push({ courseId: (course._id as mongoose.Types.ObjectId).toString() });

      await user.save();
      console.log("Course added to user:", userId);

      // Create order
      await OrderModel.create({
        userId,
        courseId,
        payment_info: decodedPayload,
      });

      // Increment purchased
      await CourseModel.findByIdAndUpdate(courseId, { $inc: { purchased: 1 } }, { new: true });

      // Send Email
      const mailData = {
        order: {
          _id: course.id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        },
      };

      const html = await ejs.renderFile(path.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });

      try {
        await sendMail({
          email: user.email,
          subject: "Order Confirmation",
          html: html,  // Direct HTML
        });
        console.log("Email sent for PhonePe order to:", user.email);
      } catch (emailError: any) {
        console.error("Email send failed:", emailError.message);
      }

      // Notification
      await NotificationModel.create({
        user: user._id,
        title: "New Order",
        message: `You have a new order ${course.name}`,
      });

      return res.status(200).send("OK");
    }

    console.log("Non-completed state:", state);
    return res.status(200).send("OK");
  } catch (error: any) {
    console.error("Callback Error:", error);
    return res.status(500).send("ERROR");
  }
};