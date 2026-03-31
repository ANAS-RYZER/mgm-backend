import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AgentService } from "../agent.service";
import { Model } from "mongoose";
import { AgentDocument } from "../schemas/agent.schema";
import { InjectModel } from "@nestjs/mongoose";
import {  AgentProfile, AgentProfileDocument } from "../schemas/agent.profile.schema";
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
@InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>) {}

  async getCustomersByAgentId(agentId: string, search?: string) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    const refId = agent.referralCode?.toString();
    // Base filter
    const filter: any = {
      refId: refId,
    };
    // Add search condition
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

    return {
      customers,
    };
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



}