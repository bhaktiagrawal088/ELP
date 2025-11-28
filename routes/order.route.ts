import express from 'express'
import { authorizeRoles, isAuthenticated } from '../middlerware/auth';
import { createOrder, getAllOrders } from '../controllers/order.controller';
import { updateAccessToken } from '../controllers/user.controller';
import { initiatePayment, paymentCallback } from '../controllers/phonepe.controller';
const orderRouter = express.Router();

orderRouter.post('/create-order', isAuthenticated, createOrder);
orderRouter.get('/get-all-orders',updateAccessToken, isAuthenticated, authorizeRoles('admin'), getAllOrders);




orderRouter.post("/payment/initiate", isAuthenticated, initiatePayment);
orderRouter.post("/payment/phonepe/callback", paymentCallback);


export default orderRouter;