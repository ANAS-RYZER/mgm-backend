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
    
    console.log("create Dto", createDto);

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

    // Create commission record for the agent as soon as order is created.
    // (Dashboard will then be able to show commission immediately.)
    await this.createAgentCommission(order);

    return {
      orderId: order._id,
      status: order.status,
      appointmentId: order.appointmentId,
    };
  }

  private async createAgentCommission(order: OrderDocument) {
    // Safety check
    if (!order.totalPrice || !order.userId) return;

    // Find agent using referralCode OR agentId stored in order.agentId
    const agent = await this.agentProfileModel
      .findOne({
        $or: [{ referralCode: order.agentId }, { agentId: order.agentId }],
      })
      .lean()
      .exec();

    if (!agent) return;

    // Commission comes from order.breakdown.commission if frontend computed it,
    // otherwise fall back to product commissionPercentage.
    const totalPrice = Number(order.totalPrice);
    const breakdownCommission = order.breakdown?.commission;

    let commissionAmount: number | undefined =
      typeof breakdownCommission === "number" ? breakdownCommission : undefined;
    let commissionPercentage: number | undefined;

    if (commissionAmount !== undefined && totalPrice > 0) {
      commissionPercentage = Number(
        ((commissionAmount / totalPrice) * 100).toFixed(2),
      );
      commissionAmount = Number(commissionAmount.toFixed(2));
    }

    // If breakdown commission is missing, use product commissionPercentage.
    if (
      commissionPercentage === undefined ||
      commissionPercentage === 0 ||
      commissionAmount === undefined
    ) {
      const productSkus = order.productSku ?? [];
      const products = await this.productModel
        .find({ sku: { $in: productSkus } })
        .select("commissionPercentage")
        .lean()
        .exec();

      const productPerc = products?.[0]?.commissionPercentage;
      if (typeof productPerc === "number") {
        commissionPercentage = productPerc;
        commissionAmount = Number(
          ((totalPrice * commissionPercentage) / 100).toFixed(2),
        );
      }
    }

    // Final safety fallback to avoid schema validation errors.
    commissionPercentage = commissionPercentage ?? 0;
    commissionAmount = commissionAmount ?? 0;

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

  async findOne(orderId: string) {
    const [order] = await this.orderModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(orderId),
        },
      },

      {
        $lookup: {
          from: "users",
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
                fullName: 1,
                email: 1,
                avatar: 1,
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

      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointmentDetails",
        },
      },
      {
        $unwind: {
          path: "$appointmentDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "agentprofiles",
          let: { agentId: "$agentId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$referralCode", "$$agentId"] },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                phoneNumber: 1,
                agentId: 1,
              },
            },
          ],
          as: "agent",
        },
      },
      {
        $unwind: {
          path: "$agent",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔗 Product Details (by SKU)
      {
        $lookup: {
          from: "products",
          let: { skus: "$productSku" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$sku", "$$skus"] },
              },
            },
            {
              $project: {
                name: 1,
                sku: 1,
                image: 1,
                mrpPrice: 1,
                discountedPrice: 1,
                quantity: 1,
              },
            },
          ],
          as: "productDetails",
        },
      },

      {
        $project: {
          __v: 0,
          "userDetails.password": 0,
        },
      },
    ]);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
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
              image: "$$p.image",
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
