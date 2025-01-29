import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middlerware/auth';
import { getNotification, updateNotification } from '../controllers/notifiction.controller';

const notificationRoute = express.Router();

notificationRoute.get('/get-notifications', isAuthenticated, authorizeRoles('admin'), getNotification);
notificationRoute.put('/update-notifications/:id', isAuthenticated, authorizeRoles('admin'), updateNotification);


export default notificationRoute;