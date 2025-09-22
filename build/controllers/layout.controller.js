"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayoutByType = exports.editLayout = exports.createLayout = void 0;
const ErrorHandler_1 = __importDefault(require("../utlis/ErrorHandler"));
const CashAsyncErrors_1 = require("../middlerware/CashAsyncErrors");
const layout_model_1 = __importDefault(require("../models/layout.model"));
const cloudinary_1 = __importDefault(require("cloudinary"));
// create layout
exports.createLayout = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        const isTypeExit = await layout_model_1.default.findOne({ type });
        if (isTypeExit) {
            return next(new ErrorHandler_1.default(`${type} already exist`, 400));
        }
        if (type === 'Banner') {
            const { image, title, subTitle } = req.body;
            const myCloud = await cloudinary_1.default.v2.uploader.upload(image, {
                folder: "layout",
            });
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                },
                title,
                subTitle,
            };
            await layout_model_1.default.create(banner);
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqItems = await Promise.all(faq.map(async (item) => {
                return {
                    question: item.question,
                    answer: item.answer,
                };
            }));
            await layout_model_1.default.create({ type: "FAQ", faq: faqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesItems = await Promise.all(categories.map(async (item) => {
                return {
                    title: item.title,
                };
            }));
            await layout_model_1.default.create({ type: "Categories", categories: categoriesItems });
        }
        res.status(201).json({
            success: true,
            message: "Layout created successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// edit layout
exports.editLayout = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (type === 'Banner') {
            const bannerData = await layout_model_1.default.findOne({ type: "Banner" });
            if (!bannerData) {
                return res.status(404).json({ success: false, message: "Banner not found" });
            }
            const { image, title, subTitle } = req.body;
            let uploadedData;
            if (!image.startsWith("https")) {
                uploadedData = await cloudinary_1.default.v2.uploader.upload(image, {
                    folder: "layout",
                });
            }
            const banner = {
                type: "Banner",
                image: {
                    public_id: image.startsWith("https")
                        ? bannerData.banner?.image?.public_id
                        : uploadedData?.public_id,
                    url: image.startsWith("https")
                        ? bannerData.banner?.image?.url
                        : uploadedData?.secure_url,
                },
                title,
                subTitle,
            };
            await layout_model_1.default.findByIdAndUpdate(bannerData._id, { banner });
        }
        //     const data  = image.startsWith("https")
        //     ? bannerData
        //     : await cloudinary.v2.uploader.upload(image,{
        //         folder : "layout",
        //    })
        //    const banner = {
        //     type : "Banner",
        //     image : {
        //         public_id : image.startsWith("https")
        //         ? bannerData.banner.image.public_id
        //         : data?.public_id,
        //         url : image.startsWith("https")
        //         ? bannerData.banner.image?.url
        //         : data.secure_url,
        //     },
        //     title,
        //     subTitle
        //    }
        //    await LayoutModel.findByIdAndUpdate(bannerData._id, {banner}); 
        // }
        //     if(bannerData){
        //         await cloudinary.v2.uploader.destroy(bannerData?.image.public_id);   
        //     }
        //     const myCloud = await cloudinary.v2.uploader.upload(image,{
        //         folder : "layout",
        //     })
        //     const banner = {
        //         image :{
        //             public_id : myCloud.public_id,
        //             url : myCloud.secure_url,
        //         },
        //         title,
        //         subTitle,
        //     }
        //     await LayoutModel.findByIdAndUpdate(bannerData._id,{banner});
        // }
        if (type === "FAQ") {
            const { faq } = req.body;
            const FaqItem = await layout_model_1.default.findOne({ type: "FAQ" });
            const faqItems = await Promise.all(faq.map(async (item) => {
                return {
                    question: item.question,
                    answer: item.answer,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(FaqItem?._id, { type: "FAQ", faq: faqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const CategoriesItem = await layout_model_1.default.findOne({ type: "Categories" });
            const categoriesItems = await Promise.all(categories.map(async (item) => {
                return {
                    title: item.title,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(CategoriesItem?._id, { type: "Categories", categories: categoriesItems });
        }
        res.status(201).json({
            success: true,
            message: "Layout updated successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get layout by types
exports.getLayoutByType = (0, CashAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.params;
        const layout = await layout_model_1.default.findOne({ type });
        res.status(201).json({
            success: true,
            layout,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
