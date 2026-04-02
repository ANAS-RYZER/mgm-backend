import { Injectable , NotFoundException} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  AgentCommission,
  AgentCommissionDocument,
} from "../schemas/agent.commission.schema";

@Injectable()
export class AdminCommissionService {
  constructor(
    @InjectModel(AgentCommission.name)
    private agentCommissionModel: Model<AgentCommissionDocument>,
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
                        { $subtract: [{ $strLenCP: "$agent.bankDetails.accountNumber" }, 4] },
                        4
                    ]
                    }
                ]
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
}