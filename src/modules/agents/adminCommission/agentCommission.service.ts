import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  AgentCommission,
  AgentCommissionDocument,
} from "../schemas/agent.commission.schema";
import { AgentProfile, AgentProfileDocument } from "../schemas/agent.profile.schema";
import { Appointment, AppointmentDocument } from "../../appoitment/schema/appointment.schema";
import { Order, OrderDocument } from "../../order/schema/order.schema";

@Injectable()
export class AdminCommissionService {
  constructor(
    @InjectModel(AgentCommission.name)
    private agentCommissionModel: Model<AgentCommissionDocument>,

    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,

    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,

    @InjectModel(Order.name)
    private orderModel:Model<OrderDocument>
  ) {}

  async getAllCommissions(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      //  Agent lookup
      {
        $lookup: {
          from: "agentprofiles", // VERY IMPORTANT
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },

      // Order lookup (optional)
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },

      // Search
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "agent.name": { $regex: search, $options: "i" } },
                  { "agent.email": { $regex: search, $options: "i" } },
                  { referralCode: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      // Final response format
      {
        $project: {
          _id: 0,
          orderId: "$order._id",
          partnerId: "$agent.agentId",
          partnerName: "$agent.name",
          partnerEmail: "$agent.email",
          commissionAmount: 1,
          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [data, total] = await Promise.all([
      this.agentCommissionModel.aggregate(pipeline),
      this.agentCommissionModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCommissionDetails(orderId: string) {
    const orderObjectId = new Types.ObjectId(orderId);

    const data = await this.agentCommissionModel.aggregate([
      //Match by orderId
      {
        $match: {
          orderId: orderObjectId,
        },
      },

      // Agent lookup
      {
        $lookup: {
          from: "agentprofiles",
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      { $unwind: "$agent" },

      // Order lookup
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },

      // Product lookup (via SKU array)
      {
        $lookup: {
          from: "products",
          let: { skus: "$order.productSku" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$sku", "$$skus"] },
              },
            },
            {
              $project: {
                _id: 0,
                name: 1,
                sku: 1,
                mrpPrice: 1,
                image: 1,
              },
            },
          ],
          as: "products",
        },
      },

      // Final Response
      {
        $project: {
          _id: 0,

          // Agent Details
          agent: {
            name: "$agent.name",
            email: "$agent.email",
            agentId: "$agent.agentId",
            bankName: "$agent.bankDetails.bankName",
            accountNumber: {
              $concat: [
                "XXXXXXXXXXX",
                {
                  $substrCP: [
                    "$agent.bankDetails.accountNumber",
                    {
                      $subtract: [
                        { $strLenCP: "$agent.bankDetails.accountNumber" },
                        4,
                      ],
                    },
                    4,
                  ],
                },
              ],
            },
          },
          // Products
          products: 1,

          // Order Breakdown
          breakdown: {
            baseValue: "$order.breakdown.basePriceTotal",
            valueAddition: "$order.breakdown.vaTotal",
            makingCharges: "$order.breakdown.makingTotal",
            discount: "$order.breakdown.discountTotal",
            totalAmount: "$order.breakdown.grandTotal",
          },

          // Commission
          commissionAmount: "$commissionAmount",
        },
      },
    ]);

    if (!data.length) {
      throw new NotFoundException("Commission not found");
    }

    return data[0];
  }
  async getAgentCommissions(
    agentId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new NotFoundException("Invalid agent id");
    }

    const agentObjectId = new Types.ObjectId(agentId);
    const skip = (page - 1) * limit;

    const query = { agentId: agentObjectId };

    const [items, totalCount] = await Promise.all([
      this.agentCommissionModel
        .find(query)
        .select({
          orderId: 1,
          totalOrderAmount: 1,
          commissionPercentage: 1,
          commissionAmount: 1,
          isPaid: 1,
          referralCode: 1,
          createdAt: 1,
          _id: 0,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.agentCommissionModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    };
  }


async getAgentDashboard(agentId: string) {
  const isObjectId = Types.ObjectId.isValid(agentId);

  // ✅ 1. Get Agent
  const agent = await this.agentProfileModel.findOne(
    isObjectId
      ? { _id: new Types.ObjectId(agentId) }
      : { agentId: agentId.trim().toUpperCase() }
  ).lean();

  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  // ✅ IMPORTANT: Use referralCode for mapping
  const referralCode = agent.referralCode;

  // ----------------------------------------
  // ✅ 2. Total Appointments (FIXED)
  // ----------------------------------------
  const totalAppointments = await this.appointmentModel.countDocuments({
    $or: [{ agentId: referralCode }, { agentid: referralCode }],
  });

  // ----------------------------------------
  // ✅ 3. Recent Appointments (FIXED)
  // ----------------------------------------
  const recentAppointments = await this.appointmentModel
    .find({
      $or: [{ agentId: referralCode }, { agentid: referralCode }],
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("userId", "fullName email")
    .lean();

  // ----------------------------------------
  // ✅ 4. Orders (ASSUMING orders use referralCode)
  // ----------------------------------------
  const orders = await this.orderModel.aggregate([
    {
      $match: {
        agentId: referralCode, // ✅ FIXED
      },
    },
    {
      $lookup: {
        from: "appointments",
        localField: "appointmentId",
        foreignField: "_id",
        as: "appointment",
      },
    },
    { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
  ]);

  // ----------------------------------------
  // ✅ 5. Total Orders Count
  // ----------------------------------------
  const totalOrders = await this.orderModel.countDocuments({
    agentId: referralCode, // ✅ FIXED
  });

  // Total Sales

  const totalSalesAgg = await this.orderModel.aggregate([
    {
      $match: { agentId: referralCode }, 
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalPrice" },
      },
    },
  ]);

  const totalSales = totalSalesAgg[0]?.totalSales || 0;

  // Total Commission (FIXED LOGIC)
  const totalCommissionAgg = await this.agentCommissionModel.aggregate([
    {
      $match: {
        referralCode: referralCode, 
      },
    },
    {
      $group: {
        _id: null,
        totalCommission: { $sum: "$commissionAmount" },
      },
    },
  ]);

  const totalCommission = totalCommissionAgg[0]?.totalCommission || 0;
  // FINAL RESPONSE
  return {
    agentInfo: {
      agentId: agent.agentId,
      name: agent.name,
      email: agent.email,
      phoneNumber: agent.phoneNumber,
      referralCode: agent.referralCode,
    },

    stats: {
      totalAppointments,
      totalOrders,
      totalSales,
      totalCommission,
    },

    recentAppointments: recentAppointments.map((a: any) => ({
      userName: a.userId?.fullName,
      email: a.userId?.email,
      date: a.date,
      status: a.status,
    })),

    recentOrders: orders.map((o) => ({
      orderId: o._id,
      amount: o.totalPrice,
      date: o.createdAt,
    })),
  };
}
}

