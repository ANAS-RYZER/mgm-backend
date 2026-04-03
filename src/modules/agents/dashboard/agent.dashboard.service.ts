import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AgentService } from "../agent.service";
import { Model, Types } from "mongoose";
import { AgentDocument } from "../schemas/agent.schema";
import { InjectModel } from "@nestjs/mongoose";
import {  AgentProfile, AgentProfileDocument } from "../schemas/agent.profile.schema";
import { AgentCommission, AgentCommissionDocument } from "../schemas/agent.commission.schema";
import {  User, UserDocument } from "src/modules/users/schemas/user.schema";
import { Product, ProductDocument } from "src/modules/products/schemas/product.schema";
import { Order, OrderDocument } from "src/modules/order/schema/order.schema";
import { Appointment, AppointmentDocument } from "src/modules/appoitment/schema/appointment.schema";


@Injectable()
export class AgentDashboardService {
  constructor(@InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfileDocument>
, @InjectModel(User.name) private userModel: Model<UserDocument>,
  @InjectModel(Product.name) private productModel: Model<ProductDocument>,
 @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
@InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
@InjectModel(AgentCommission.name) private agentCommissionModel: Model<AgentCommissionDocument>) {}

  async getCommissionSummary(agentId: string) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new NotFoundException("Invalid agent id");
    }

    const agentObjectId = new Types.ObjectId(agentId);

    const [stats, recentCommissions] = await Promise.all([
      this.agentCommissionModel.aggregate([
        { $match: { agentId: agentObjectId } },
        {
          $group: {
            _id: null,
            totalCommissionAmount: { $sum: "$commissionAmount" },
            paidCommissionAmount: {
              $sum: {
                $cond: ["$isPaid", "$commissionAmount", 0],
              },
            },
            paidCount: { $sum: { $cond: ["$isPaid", 1, 0] } },
            unpaidCount: { $sum: { $cond: ["$isPaid", 0, 1] } },
          },
        },
      ]),
      this.agentCommissionModel
        .find({ agentId: agentObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .exec(),
    ]);

    const safeStats = stats?.[0] ?? {
      totalCommissionAmount: 0,
      paidCommissionAmount: 0,
      unpaidCount: 0,
      paidCount: 0,
    };

    const totalCommissionAmount = safeStats.totalCommissionAmount ?? 0;
    const paidCommissionAmount = safeStats.paidCommissionAmount ?? 0;
    const unpaidCommissionAmount = totalCommissionAmount - paidCommissionAmount;
    const unpaidCount = safeStats.unpaidCount ?? 0;
    const paidCount = safeStats.paidCount ?? 0;

    return {
      totalCommissionAmount,
      paidCommissionAmount,
      unpaidCommissionAmount,
      unpaidCount,
      paidCount,
      recentCommissions,
    };
  }

  async getMyCommissions(agentId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new NotFoundException("Invalid agent id");
    }

    const agentObjectId = new Types.ObjectId(agentId);
    const skip = (page - 1) * limit;

    const [commissions, totalCount] = await Promise.all([
      this.agentCommissionModel
        .find({ agentId: agentObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.agentCommissionModel.countDocuments({ agentId: agentObjectId }),
    ]);

    const items = commissions.map((c) => ({
      orderId: c.orderId,
      commissionPercentage: c.commissionPercentage,
      commissionAmount: c.commissionAmount,
      isPaid: c.isPaid,
      // `AgentCommission` uses `timestamps: true`, but the TS type doesn't
      // currently expose `createdAt`.
      createdAt: (c as any).createdAt,
      referralCode: c.referralCode,
    }));

    const totalPages = Math.ceil(totalCount / limit);
    return {
      items,
      totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async getCustomersByAgentId(
    agentId: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    const filter: any = {
      refId: refId,
    };

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await this.userModel
      .find(filter)
      .select('-password -isEmailVerified -createdAt -updatedAt')
      .lean();

    // PAGINATION (only added this part)
    const total = customers.length;
    const skip = (page - 1) * limit;

    const paginatedCustomers = customers.slice(skip, skip + limit);

    return {
      customers: paginatedCustomers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerDetails(
    customerId: string,
    agentId: string,
  ) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new NotFoundException('Invalid Customer ID');
    }

    // Step 1: validate agent
    const agent = await this.agentProfileModel.findOne({ _id: agentId });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    if (!refId) {
      throw new NotFoundException('Agent referral code not found');
    }

    // Step 2: get customer (IMPORTANT: match refId also)
    const user = await this.userModel
      .findOne({
        _id: customerId,
        refId: refId, // ensures this customer belongs to agent
      })
      .select('_id fullName email createdAt ')
      .lean();

    if (!user) {
      throw new NotFoundException(
        'Customer not found or not linked to this agent',
      );
    }

    //  Step 3: response
    return {
      customerId: user._id.toString(),
      name: user.fullName,
      email: user.email,
      createdDate: user.createdAt,
      referralCode: user.refId,
      avatar: user.avatar,
    };
  }

  async getCustomerAppointments(
    customerId: string,
    agentId: string,
  ) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new NotFoundException('Invalid Customer ID');
    }

    // Step 1: validate agent
    const agent = await this.agentProfileModel.findById(agentId);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    // Step 2: get customer
    const user = await this.userModel
      .findById(customerId)
      .select('fullName email')
      .lean();

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    // Step 3: get appointments (agent + customer)
    const appointments = await this.appointmentModel
      .find({
        userId: customerId,
        $or: [
          { referralCode: refId },
          { agentId: refId },
          { agentid: refId },
        ],
      })
      .sort({ date: -1 })
      .lean();

    // Step 4: format response
    return appointments.map((appt) => ({
      appointmentId: appt._id,
      customerName: user.fullName,
      email: user.email,
      date: appt.date,
      slot: `${appt.slotStartTime} - ${appt.slotEndTime}`,
      numberOfOrders: appt.productIds?.length || 0, 
      status: appt.status,
    }));
  }

  async getCustomerOrders(customerId: string, agentId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new NotFoundException('Invalid Customer ID');
    }

    const agent = await this.agentProfileModel.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const agentCode = agent.referralCode?.toString();

    const orders = await this.orderModel
      .find({
        $and: [
          {
            $or: [
              { userId: new Types.ObjectId(customerId) },
              { userId: customerId },
            ],
          },
          {
            $or: [{ agentId: agentCode }, { agentId: agentId }],
          },
        ],
      })
      .lean();

    if (!orders.length) return [];

    // ✅ Appointments
    const appointmentIds = orders.map((o) => o.appointmentId);

    const appointments = await this.appointmentModel
      .find({ _id: { $in: appointmentIds } })
      .lean();

    const appointmentMap = new Map(
      appointments.map((a) => [a._id.toString(), a]),
    );

    // ✅ Get SKUs
    const allSkus = orders.flatMap((o) => o.productSku || []);
    console.log("ORDER SKUS:", allSkus);

    // ✅ ONLY sku FIELD
    const products = await this.productModel
      .find({ sku: { $in: allSkus } })
      .lean();

    console.log("PRODUCTS FOUND:", products);

    const productMap = new Map(
      products.map((p) => [p.sku, p]),
    );

    const purchasedProducts: any[] = [];

    for (const order of orders) {
      const appt = appointmentMap.get(
        order.appointmentId?.toString(),
      );

      const totalProducts = order.productSku?.length || 1;

      for (const sku of order.productSku || []) {
        const product = productMap.get(sku);

        console.log("MATCH CHECK:", sku, "=>", product);

        purchasedProducts.push({
          productType: product?.categories || null,
          productName: product?.name ||  null,
          appointmentDate: appt?.date || '',
          productPrice:
            (order.breakdown?.grandTotal || 0) / totalProducts,
        });
      }
    }

    return purchasedProducts;
  }

  async getCustomerCountByAgentId(agentId: string) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    // COUNT ONLY
    const count = await this.userModel.countDocuments({
      refId: refId,
    });

    return {
      totalCustomers: count,
    };
  }

  async getAgent(agentId: string) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId }).select('agentId name email phoneNumber dob ');
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async getCustomerById(agentId: string, userId: string) {
    // Check agent exists
    const agent = await this.agentProfileModel.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    // Find user by id AND match referral id
    const user = await this.userModel
      .findOne({
        _id: userId,
        refId: refId,
      })
      .select('-password -isEmailVerified  -updatedAt')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found for this agent');
    }

    return { user };
  }

  async getUserAppointments(
    agentId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // verify agent
    const agent = await this.agentProfileModel.findById(agentId);
    if (!agent) throw new NotFoundException('Agent not found');

    const referralCode = agent.referralCode?.toString();

    // verify user belongs to agent
    const user = await this.userModel.findOne({
      _id: userId,
      refId: referralCode,
    });
    if (!user) throw new NotFoundException('User not linked to this agent');

    // pagination calc
    const skip = (page - 1) * limit;

    // fetch appointments with pagination
    const [appointments, total] = await Promise.all([
      this.appointmentModel
        .find({
          userId: userId,
          referralCode: referralCode,
        })
        .populate({
          path: 'productIds',
          select: 'sku name mrpPrice gallery image goldSpecs stoneSpecs',
          model: 'Product',
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.appointmentModel.countDocuments({
        userId: userId,
        referralCode: referralCode,
      }),
    ]);

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getAgentDashboard(
    agentId: string,
    referralCode: string,
  ) {
    //  AGENT DETAILS
    const agent = referralCode
      ? await this.agentProfileModel
          .findOne({ referralCode })
          .select("name agentId referralCode")
      : await this.agentProfileModel
          .findOne({ agentId })
          .select("name agentId referralCode");

    const agentName = agent?.name || "";

    // MATCH LOGIC
    const or: any[] = [];

    if (referralCode) {
      or.push({ referralCode });
    }

    if (agentId) {
      or.push({ agentId }, { agentid: agentId });
    }

    const matchCondition = or.length ? { $or: or } : {};

    // APPOINTMENT STATS (OPTIMIZED)
    const stats = await this.appointmentModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },

          confirmed: {
            $sum: {
              $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0],
            },
          },

          visited: {
            $sum: {
              $cond: [{ $eq: ["$status", "ISVISITED"] }, 1, 0],
            },
          },

          purchased: {
            $sum: {
              $cond: [{ $eq: ["$status", "ISPURCHASED"] }, 1, 0],
            },
          },

          notVisited: {
            $sum: {
              $cond: [{ $eq: ["$status", "NOTVISITED"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalAppointments = stats[0]?.total || 0;
    const confirmedCount = stats[0]?.confirmed || 0;
    const visitedCount = stats[0]?.visited || 0;
    const purchasedCount = stats[0]?.purchased || 0;
    const notVisitedCount = stats[0]?.notVisited || 0;

    //  VISITED RATE (VISITED + PURCHASED)
    const visitedRate =
      totalAppointments > 0
        ? Math.round(
            ((visitedCount + purchasedCount) / totalAppointments) * 100,
          )
        : 0;

    // TOTAL CUSTOMERS

    const totalCustomers = referralCode
      ? await this.userModel.countDocuments({ refId: referralCode })
      : 0;

    // TOTAL EARNINGS

    const earningsAgg = await this.agentCommissionModel.aggregate([
      {
        $match: {
          ...(referralCode ? { referralCode } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$commissionAmount" },
        },
      },
    ]);

    const totalEarnings = earningsAgg[0]?.totalEarnings || 0;

    // MONTHLY EARNINGS

    const monthlyAgg = await this.agentCommissionModel.aggregate([
      {
        $match: {
          ...(referralCode ? { referralCode } : {}),
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$commissionAmount" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyEarnings = monthlyAgg.map((item) => ({
      year: item._id.year,
      month: monthNames[item._id.month],
      earnings: item.total,
    }));

    // RECENT APPOINTMENTS

    const recentAppointments = await this.appointmentModel.aggregate([
        { $match: matchCondition },
        // Convert userId string → ObjectId
        {
          $addFields: {
            userIdObj: { $toObjectId: "$userId" },
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "userIdObj",
            foreignField: "_id",
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
          $project: {
            _id: 1,
            customerName: "$user.fullName",
            date: 1,
            slot: {
              $concat: ["$slotStartTime", " - ", "$slotEndTime"],
            },
            status: 1,
            createdAt: 1,
          },
        },

        { $sort: { createdAt: -1 } },
        { $limit: 5 },
      ]);
    // RECENT CUSTOMERS

    const recentCustomers = referralCode
      ? await this.userModel
          .find({ refId: referralCode })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("fullName email createdAt")
      : [];

    //  FINAL RESPONSE
    return {
      agentName,
      totalEarnings,
      totalCustomers,
      totalAppointments,
      visitedRate,
      appointmentStatus: {
        total: totalAppointments,
        confirmed: confirmedCount,
        visited: visitedCount,
        purchased: purchasedCount,
        notVisited: notVisitedCount,
      },
      monthlyEarnings,
      recentAppointments,
      recentCustomers,
    };
  }

  async getAgentCommission(
    agentId: string,
    referralCode: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {

    // AGENT DETAILS
    const agent = referralCode
      ? await this.agentProfileModel
          .findOne({ referralCode })
          .select('name agentId referralCode')
      : await this.agentProfileModel
          .findOne({ agentId })
          .select('name agentId referralCode');

    const agentName = agent?.name || '';


    // MATCH LOGIC

    const or: any[] = [];

    if (referralCode) {
      or.push({ referralCode });
    }

    if (agentId) {
      or.push({ agentId }, { agentid: agentId });
    }

    const matchCondition = or.length ? { $or: or } : {};

    //  PAGINATION

    const skip = (page - 1) * limit;


    // BASE PIPELINE

    const pipeline: any[] = [
      {
        $match: matchCondition,
      },

      {
        $addFields: {
          userId: {
            $cond: {
              if: { $eq: [{ $type: "$userId" }, "string"] },
              then: { $toObjectId: "$userId" },
              else: "$userId",
            },
          },
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // SEARCH (NAME + EMAIL)

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // FINAL PROJECTION
    pipeline.push(
      {
        $addFields: {
          customerName: { $ifNull: ['$user.fullName', ''] },
          customerEmail: { $ifNull: ['$user.email', ''] },
        },
      },
      {
        $project: {
          _id: 0,
          orderId: 1,
          commissionAmount: 1,
          createdAt: 1,
          customerName: 1,
          customerEmail: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    );

    // EXECUTE QUERY
    const commissions = await this.agentCommissionModel.aggregate(pipeline);

    // TOTAL COUNT (WITH SEARCH)

    const countPipeline: any[] = [
      { $match: matchCondition },

      {
        $addFields: {
          userId: {
            $cond: {
              if: { $eq: [{ $type: "$userId" }, "string"] },
              then: { $toObjectId: "$userId" },
              else: "$userId",
            },
          },
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      countPipeline.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    countPipeline.push({ $count: 'total' });

    const countResult = await this.agentCommissionModel.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // FINAL RESPONSE
    return {
      agentName,
      referralCode: agent?.referralCode || '',
      commissions,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
      },
    };
  }

  async getCommissionDetails(
    orderId: string,
    agentId: string,
    referralCode: string,
  ) {
    const or: any[] = [];
    if (referralCode) {
      or.push({ referralCode });
    }
    if (agentId) {
      or.push({ agentId }, { agentid: agentId });
    }
    const matchCondition = or.length ? { $or: or } : {};
    // AGGREGATION
    const result = await this.agentCommissionModel.aggregate([
      {
        $match: {
          orderId: new Types.ObjectId(orderId),
          ...matchCondition,
        },
      },
      //  USER JOIN
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $eq: [{ $type: "$userId" }, "objectId"] },
              then: "$userId",
              else: { $toObjectId: "$userId" },
            },
          },
        },
      },
      // USER JOIN
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // ORDER JOIN
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      // PRODUCT JOIN (using SKU array)
      {
        $lookup: {
          from: "products",
          localField: "order.productSku",
          foreignField: "sku",
          as: "products",
        },
      },
      //  FINAL FORMAT
      {
        $project: {
          _id: 0,
          // Commission
          orderId: 1,
          commissionAmount: 1,
          createdAt: 1,
          // Customer
          customerName: { $ifNull: ["$user.fullName", ""] },
          customerEmail: { $ifNull: ["$user.email", ""] },
          // Order Breakdown
          breakdown: {
              baseValue: { $round: [{ $ifNull: ["$order.breakdown.basePriceTotal", 0] }, 2] },
              valueAddition: { $round: [{ $ifNull: ["$order.breakdown.vaTotal", 0] }, 2] },
              makingCharges: { $round: [{ $ifNull: ["$order.breakdown.makingTotal", 0] }, 2] },
              discount: { $round: [{ $ifNull: ["$order.breakdown.discountTotal", 0] }, 2] },
              totalAmount: { $round: [{ $ifNull: ["$order.breakdown.grandTotal", 0] }, 2] },
            },
          // Products
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
        },
      },
    ]);

    return result[0] || {};
  }

  async getCommissioncount(agentId: string, referralCode: string) {
    const agent = referralCode
      ? await this.agentProfileModel
          .findOne({ referralCode })
          .select("name agentId referralCode")
      : await this.agentProfileModel
          .findOne({ agentId })
          .select("name agentId referralCode");

    const agentName = agent?.name || "";

    // MATCH LOGIC (SAME AS YOURS)

    const or: any[] = [];

    if (referralCode) {
      or.push({ referralCode });
    }

    if (agentId) {
      or.push({ agentId }, { agentid: agentId }); // keep your existing logic
    }

    const matchCondition = or.length ? { $or: or } : {};

    // COMMISSION SUMMARY

    const commissionSummary = await this.agentCommissionModel.aggregate([
      {
        $match: matchCondition,
      },
      {
        $group: {
          _id: null,
          totalCommissionAmount: { $sum: "$commissionAmount" },
          // optional split
          paidCommission: {
            $sum: {
              $cond: [{ $eq: ["$isPaid", true] }, "$commissionAmount", 0],
            },
          },
          unpaidCommission: {
            $sum: {
              $cond: [{ $eq: ["$isPaid", false] }, "$commissionAmount", 0],
            },
          },
        },
      },
    ]);

    const summary = commissionSummary[0] || {
      totalCommissionAmount: 0,
      paidCommission: 0,
      unpaidCommission: 0,
    };

    // FINAL RESPONSE

    return {
      agentName,
      referralCode: agent?.referralCode || "",
      agentId: agent?.agentId || "",
      ...summary,
    };
  }

}