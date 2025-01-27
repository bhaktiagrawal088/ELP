require("dotenv").config();
import {app} from './app';
import connectDB from './utlis/db';
import { v2 as cloudinary} from "cloudinary";
 

 // create the server
app.listen(process.env.PORT , () => {
    console.log(`Server with connected with PORT ${process.env.PORT}`)
    connectDB();
});

// cloudinary config

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.CLOUD_API_KEY,
    api_secret : process.env.CLOUD_SECRET_KEY,
});


