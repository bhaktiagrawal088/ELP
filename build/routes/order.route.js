"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlerware/auth");
const order_controller_1 = require("../controllers/order.controller");
const user_controller_1 = require("../controllers/user.controller");
const phonepe_controller_1 = require("../controllers/phonepe.controller");
const orderRouter = express_1.default.Router();
orderRouter.post('/create-order', auth_1.isAuthenticated, order_controller_1.createOrder);
orderRouter.get('/get-all-orders', user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)('admin'), order_controller_1.getAllOrders);
orderRouter.post("/payment/initiate", auth_1.isAuthenticated, phonepe_controller_1.initiatePayment);
orderRouter.post("/payment/phonepe/callback", phonepe_controller_1.paymentCallback);
exports.default = orderRouter;
