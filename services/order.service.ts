  import { NextFunction , Response} from "express";
import { CatchAsyncError } from "../middlerware/CashAsyncErrors";
import orderModel from "../models/orderModel";


  // create new order
  export const newOrder = CatchAsyncError(async(data:any, res: Response, next: NextFunction) => {
    const order = await orderModel.create(data);
    
    res.status(201).json({
        success: true,
        order: order
    })

})