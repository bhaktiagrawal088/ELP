"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getAllUsersService = exports.getUserById = void 0;
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const redis_1 = require("../utlis/redis");
const user_model_1 = __importDefault(require("../models/user.model"));
// get user by id
const getUserById = async (id, res, next) => {
    try {
        const userJson = await redis_1.redis.get(id);
        if (userJson) {
            const user = JSON.parse(userJson);
            if (!user) {
                return next(new ErrorHandler_1.default("User not found", 404));
            }
            res.status(201).json({
                success: true,
                user,
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
};
exports.getUserById = getUserById;
// Get All user
const getAllUsersService = async (res) => {
    const users = await user_model_1.default.find().sort({ createAt: -1 });
    res.status(201).json({
        success: true,
        users,
    });
};
exports.getAllUsersService = getAllUsersService;
// update user role
const updateUserRoleService = async (res, id, role) => {
    const user = await user_model_1.default.findByIdAndUpdate(id, { role }, { new: true });
    res.status(201).json({
        success: true,
        user
    });
};
exports.updateUserRoleService = updateUserRoleService;
