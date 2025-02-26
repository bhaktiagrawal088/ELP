import express from 'express';
import { authorizeRoles, isAuthenticated } from '../middlerware/auth';
import { getNotification, updateNotification } from '../controllers/notifiction.controller';
import { updateAccessToken } from '../controllers/user.controller';

const notificationRoute = express.Router();

notificationRoute.get('/get-notifications', updateAccessToken, isAuthenticated, authorizeRoles('admin'), getNotification);
notificationRoute.put('/update-notifications/:id', updateAccessToken, isAuthenticated, authorizeRoles('admin'), updateNotification);


export default notificationRoute;