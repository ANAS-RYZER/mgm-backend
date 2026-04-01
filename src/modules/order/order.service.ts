import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument, OrderStatus } from "./schema/order.schema";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import {
  Appointment,
  AppointmentDocument,
} from "../appoitment/schema/appointment.schema";
import { Product, ProductDocument } from "../products/schemas/product.schema";
import {
  AgentProfile,
  AgentProfileDocument,
} from "../agents/schemas/agent.profile.schema";
import {
  AgentCommission,
  AgentCommissionDocument,
} from "../agents/schemas/agent.commission.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { AppointmentStatus } from "../appoitment/dto/appoitment.dto";
@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @InjectModel(AgentCommission.name)
    private agentCommissionModel: Model<AgentCommissionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Create Order
  async create(appointmentId: string, createDto: CreateOrderDto) {
    //  Check appointment exists
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    // Create order using appointment data
    const order = await this.orderModel.create({
      appointmentId: new Types.ObjectId(appointmentId),
      userId: appointment.userId,
      agentId: appointment.agentid,
      productSku: createDto.productSku,
      totalPrice: createDto.totalPrice,
      status: OrderStatus.CREATE_ORDER,
      breakdown: createDto.breakdown,
    });

    if (!order) {
      throw new BadRequestException("Failed to create order");
    }

    await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      {
        status: AppointmentStatus.ISPURCHASED,
      },
      { new: true },
    );

    return {
      orderId: order._id,
      status: order.status,
      appointmentId: order.appointmentId,
    };
  }

  private async createAgentCommission(order: OrderDocument) {
    // Safety check
    if (!order.totalPrice || !order.userId) return;

    //  Find agent using referralCode stored in order.agentId
    const agent = await this.agentProfileModel
      .findOne({ referralCode: order.agentId })
      .lean()
      .exec();

    if (!agent) return;

    const commissionPercentage = 2;

    const commissionAmount = (order.totalPrice * commissionPercentage) / 100;

    // Prevent duplicate commission
    const existingCommission = await this.agentCommissionModel.findOne({
      orderId: order._id,
    });

    if (existingCommission) return;

    // Store agentId AND referralCode
    await this.agentCommissionModel.create({
      orderId: order._id,
      agentId: agent._id,
      userId: order.userId,
      referralCode: agent.referralCode,
      totalOrderAmount: order.totalPrice,
      commissionPercentage,
      commissionAmount,
      isPaid: false,
    });
  }

  // Update Order
  async update(orderId: string, updateDto: UpdateOrderDto) {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Check productSku exists in Product model
    if (updateDto.productSku && updateDto.productSku.length > 0) {
      const products = await this.productModel.find({
        sku: { $in: updateDto.productSku },
      });

      if (products.length !== updateDto.productSku.length) {
        throw new BadRequestException("One or more product SKUs do not exist");
      }

      order.productSku = updateDto.productSku;
    }

    if (updateDto.totalPrice !== undefined) {
      order.totalPrice = updateDto.totalPrice;
    }

    //  Store previous status before updating
    const previousStatus = order.status;

    if (updateDto.status) {
      order.status = updateDto.status;
    }

    const updatedOrder = await order.save();

    // Automatically create commission
    if (
      previousStatus !== OrderStatus.ORDER_SUCCESS && // prevent duplicate
      updateDto.status === OrderStatus.ORDER_SUCCESS &&
      order.agentId
    ) {
      await this.createAgentCommission(order);
    }

    return updatedOrder;
  }

  // Get Single Order
  async findOne(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .populate("appointmentId")
      .populate("userId", "fullName email avatar")
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    //  Get Agent Details
    let agentDetails: any = null;

    if (order.agentId) {
      agentDetails = await this.agentProfileModel
        .findOne({ referralCode: order.agentId }, "fullName email")
        .lean()
        .exec();
    }

    // Get Product Details using SKU
    let productDetails: any[] = [];

    if (order.productSku && order.productSku.length > 0) {
      productDetails = await this.productModel
        .find({ sku: { $in: order.productSku } })
        .lean()
        .exec();
    }

    return {
      ...order,
      agentDetails,
      productDetails,
    };
  }

  async getAllOrders(search?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const pipeline: any[] = [];

    const regex = search?.trim() ? new RegExp(search.trim(), "i") : null;

    pipeline.push(
      {
        $lookup: {
          from: this.userModel.collection.name,
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$userId" }],
                },
              },
            },
            {
              $project: {
                _id: 1,
                username: 1,
                email: 1,
                fullName: 1,
              },
            },
          ],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    pipeline.push({
      $lookup: {
        from: "products",
        localField: "productSku",
        foreignField: "sku",
        as: "products",
      },
    });

    pipeline.push({
      $lookup: {
        from: "agentprofiles",
        localField: "agentId",
        foreignField: "agentId",
        as: "partner",
      },
    });

    pipeline.push({
      $unwind: { path: "$partner", preserveNullAndEmptyArrays: true },
    });

    if (regex) {
      pipeline.push({
        $match: {
          $or: [
            { "user.fullName": regex },
            { "user.email": regex },
            { "products.name": regex },
            { "products.sku": regex },
            { "partner.name": regex },
            { "partner.agentId": regex },
          ],
        },
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        createdAt: 1,
        status: 1,

        user: {
          id: "$user._id",
          fullName: {
            $ifNull: ["$user.fullName", "$user.username"],
          },
        },

        partner: {
          name: "$partner.name",
          agentId: "$partner.agentId",
        },

        products: {
          $map: {
            input: "$products",
            as: "p",
            in: {
              name: "$$p.name",
              sku: "$$p.sku",
            },
          },
        },

        amount: "$totalPrice",

        partnerCommission: "$breakdown.commission",
      },
    });

    pipeline.push({
      $facet: {
        orders: [
          { $sort: { createdAt: -1 } }, // latest first
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await this.orderModel.aggregate(pipeline);

    const orders = result[0]?.orders || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders,
      pagination: {
        page,
        limit,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        totalCount,
        totalPages,
      },
    };
  }
}
