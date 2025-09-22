"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrdersService = exports.newOrder = void 0;
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const orderModel_1 = __importDefault(require("../models/orderModel"));
// create new order
exports.newOrder = (0, CashAsyncErrors_1.CatchAsyncError)(async (data, res, next) => {
    const order = await orderModel_1.default.create(data);
    res.status(201).json({
        success: true,
        order: order
    });
});
// get All order --- only for admin
const getAllOrdersService = async (res) => {
    const orders = await orderModel_1.default.find().sort({ createAt: -1 });
    res.status(201).json({
        success: true,
        orders,
    });
};
exports.getAllOrdersService = getAllOrdersService;
