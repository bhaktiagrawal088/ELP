import express from 'express'
import { authorizeRoles, isAuthenticated } from '../middlerware/auth';
import { createOrder, getAllOrders } from '../controllers/order.controller';
const orderRouter = express.Router();

orderRouter.post('/create-order', isAuthenticated, createOrder);
orderRouter.get('/get-all-orders', isAuthenticated, authorizeRoles('admin'), getAllOrders);


export default orderRouter;