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

// get All order --- only for admin
export const getAllOrdersService = async(res:Response) => {
  const orders = await orderModel.find().sort({createAt: -1});

  res.status(201).json({
    success: true,
    orders,
  })
}