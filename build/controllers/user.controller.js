"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUserRole = exports.getAllUsers = exports.updateProfilePicture = exports.updateUserPassword = exports.updateUserInfo = exports.socialAuth = exports.getUserInfo = exports.updateAccessToken = exports.logoutUser = exports.loginUser = exports.activateUser = exports.createActivationToken = exports.registrationUser = void 0;
require('dotenv').config();
const user_model_1 = __importDefault(require("../models/user.model"));
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utlis/sendMail"));
const jwt_1 = require("../utlis/jwt");
const redis_1 = require("../utlis/redis");
const user_service_1 = require("../services/user.service");
const cloudinary_1 = __importDefault(require("cloudinary"));
exports.registrationUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        // console.log("Backend received:", req.body); 
        const { name, email, password } = req.body;
        const isEmailExist = await user_model_1.default.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler_1.default("Email already exist", 400));
        }
        ;
        const user = {
            name, email, password,
        };
        const activationToken = (0, exports.createActivationToken)(user);
        const activationCode = activationToken.activationCode;
        const data = { user: { name: user.name }, activationCode };
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/activation-mail.ejs"), data);
        const sendMailWithTimeout = async (options, timeout = 8000) => {
            return Promise.race([
                (0, sendMail_1.default)(options),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Email sending timeout")), timeout)),
            ]);
        };
        try {
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: `Please check your email ${user.email} to activate your account!`,
                activationToken: activationToken.token,
            });
        }
        catch (error) {
            console.error("❌ sendMail failed:", error); // ADD THIS
            return next(new ErrorHandler_1.default(error.message, 400));
        }
    }
    catch (error) {
        console.error("Mail sending error:", error); // ✅ ADD THIS
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
const createActivationToken = (user) => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jsonwebtoken_1.default.sign({
        user, activationCode
    }, process.env.ACTIVATION_SECRET, {
        expiresIn: "5m",
    });
    return { token, activationCode };
};
exports.createActivationToken = createActivationToken;
exports.activateUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { activation_token, activation_code } = req.body;
        const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler_1.default("Invalid activation code", 400));
        }
        const { name, email, password } = newUser.user;
        const existUser = await user_model_1.default.findOne({ email });
        if (existUser) {
            return next(new ErrorHandler_1.default("Email already exist", 400));
        }
        const user = await user_model_1.default.create({
            name,
            email,
            password
        });
        res.status(201).json({
            success: true
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.loginUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler_1.default("Please enter email and password", 400));
        }
        ;
        const user = await user_model_1.default.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("Invalid email and password", 400));
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid email or password", 400));
        }
        (0, jwt_1.sendToken)(user, 200, res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// logout user
exports.logoutUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString() || "";
        // Ensure userId is valid
        if (!userId) {
            return next(new ErrorHandler_1.default("User ID is required for logout", 400));
        }
        // Delete the Redis key
        const redisResponse = await redis_1.redis.del(userId);
        // console.log("Redis deletion response:", redisResponse);
        res.cookie("access_token", "", {
            maxAge: 1,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });
        res.cookie("refresh_token", "", {
            maxAge: 1,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        });
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// update access token
exports.updateAccessToken = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const refresh_token = req.cookies.refresh_token;
        const decode = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN);
        const message = 'could not refresh token';
        if (!decode) {
            return next(new ErrorHandler_1.default(message, 400));
        }
        const session = await redis_1.redis.get(decode.id);
        if (!session) {
            return next(new ErrorHandler_1.default("Please login to access this resources ", 400));
        }
        const user = JSON.parse(session);
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.ACCESS_TOKEN, {
            expiresIn: '5m',
        });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id }, process.env.REFRESH_TOKEN, {
            expiresIn: '3d',
        });
        req.user = user;
        res.cookie("access_token", accessToken, jwt_1.accessTokenOptions);
        res.cookie("refresh_token", refreshToken, jwt_1.refreshTokenOptions);
        await redis_1.redis.set(user._id, JSON.stringify(user), "EX", 604800); // After 7days login again to maintence the cache 
        // res.status(200).json({
        //     success : true,
        //     accessToken,
        // })
        next();
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get user info
exports.getUserInfo = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (!userId || typeof userId !== "string") {
            return next(new ErrorHandler_1.default("User ID not found in request", 400));
        }
        await (0, user_service_1.getUserById)(userId, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// social auth
exports.socialAuth = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, name, avatar } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            const newUser = await user_model_1.default.create({ email, name, avatar });
            (0, jwt_1.sendToken)(newUser, 200, res);
        }
        else {
            (0, jwt_1.sendToken)(user, 200, res);
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserInfo = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { email, name } = req.body;
        const userId = req.user?._id;
        if (!userId || typeof userId !== "string") {
            return next(new ErrorHandler_1.default("User ID not found in request", 400));
        }
        const user = await user_model_1.default.findById(userId);
        if (email && user) {
            const isEmailExit = await user_model_1.default.findOne({ email });
            if (isEmailExit) {
                return next(new ErrorHandler_1.default("Email already exit", 400));
            }
            user.email = email;
        }
        if (name && user) {
            user.name = name;
        }
        await user?.save();
        await redis_1.redis.set(userId, JSON.stringify(user));
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateUserPassword = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword && !newPassword) {
            return next(new ErrorHandler_1.default("Both old and new passwords are required", 400));
        }
        const userId = req.user?._id?.toString();
        if (!userId) {
            return next(new ErrorHandler_1.default("User Id not found in request", 400));
        }
        const user = await user_model_1.default.findById(userId).select("+password");
        if (!user) {
            return next(new ErrorHandler_1.default("User not found in request", 400));
        }
        if (user?.password === 'undefined') {
            return next(new ErrorHandler_1.default("Invalid user", 400));
        }
        const isPasswordMatch = await user?.comparePassword(oldPassword);
        if (!isPasswordMatch) {
            return next(new ErrorHandler_1.default("Invalid old password", 400));
        }
        if (oldPassword === newPassword) {
            return next(new ErrorHandler_1.default("Password is not update", 400));
        }
        user.password = newPassword;
        await user?.save();
        await redis_1.redis.set(userId, JSON.stringify(user));
        res.status(201).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
exports.updateProfilePicture = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { avatar } = req.body;
        const userId = req.user?._id;
        if (!userId || typeof userId !== "string") {
            return next(new ErrorHandler_1.default("User ID not found in request", 400));
        }
        const user = await user_model_1.default.findById(userId);
        if (avatar && user) {
            // If user have one avatar then call this if
            if (user?.avatar?.public_id) {
                // first delete the old profile picture 
                await cloudinary_1.default.v2.uploader.destroy(user?.avatar?.public_id);
                const myCloudPicture = await cloudinary_1.default.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloudPicture.public_id,
                    url: myCloudPicture.url,
                };
            }
            else {
                const myCloudPicture = await cloudinary_1.default.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloudPicture.public_id,
                    url: myCloudPicture.url,
                };
            }
        }
        await user?.save();
        await redis_1.redis.set(userId, JSON.stringify(user));
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        next(new ErrorHandler_1.default(error.message, 400));
    }
});
// get all users --- only for admin
exports.getAllUsers = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, user_service_1.getAllUsersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// update user role -- only for admin
exports.updateUserRole = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id, role } = req.body;
        (0, user_service_1.updateUserRoleService)(res, id, role);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// delete user --- only for admin
exports.deleteUser = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await user_model_1.default.findById(id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        await user.deleteOne({ id });
        await redis_1.redis.del(id);
        res.status(201).json({
            success: "true",
            message: "User deleted successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
