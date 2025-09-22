"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const app_1 = require("./app");
const db_1 = __importDefault(require("./utlis/db"));
const cloudinary_1 = require("cloudinary");
// create the server
app_1.app.listen(process.env.PORT, () => {
    console.log(`Server with connected with PORT ${process.env.PORT}`);
    (0, db_1.default)();
});
// cloudinary config
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});
