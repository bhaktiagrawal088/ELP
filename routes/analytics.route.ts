import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middlerware/auth';
import { getCoursesAnalytics, getOrdersAnalytics, getUsersAnalytics } from '../controllers/analytics.controller';
const analayticsRouter = express.Router();


analayticsRouter.get("/get-users-analytics" , isAuthenticated, authorizeRoles('admin'),getUsersAnalytics);
analayticsRouter.get("/get-courses-analytics" , isAuthenticated, authorizeRoles('admin'),getCoursesAnalytics);
analayticsRouter.get("/get-orders-analytics" , isAuthenticated, authorizeRoles('admin'),getOrdersAnalytics);



export default analayticsRouter;