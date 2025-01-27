import express from "express";
import { activateUser, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updateProfilePicture, updateUserInfo, updateUserPassword } from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middlerware/auth";

const UserRouter = express.Router();
UserRouter.post('/registration', registrationUser);
UserRouter.post('/activate-user', activateUser);
UserRouter.post('/login', loginUser);
UserRouter.get('/logout', isAuthenticated,logoutUser);
UserRouter.get('/refresh', updateAccessToken);
UserRouter.get('/user',isAuthenticated, getUserInfo);
UserRouter.post('/social-auth', socialAuth);
UserRouter.put('/update-user-info', isAuthenticated, updateUserInfo);
UserRouter.put('/update-user-password', isAuthenticated, updateUserPassword);
UserRouter.put('/update-user-avatar', isAuthenticated, updateProfilePicture);

export default UserRouter;