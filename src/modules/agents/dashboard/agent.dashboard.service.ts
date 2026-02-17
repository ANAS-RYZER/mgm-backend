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

  async getCustomersByAgentId(agentId: string) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    const refId = agent.referralCode?.toString();

    const customers = await this.userModel
      .find({ refId: refId })
      .select('-password -isEmailVerified -createdAt -updatedAt')
      .lean();

    return {
      customers: customers,
    };
  }
  async getAgent(agentId: string) {
    const agent = await this.agentProfileModel.findOne({ _id: agentId }).select('agentId name email phoneNumber dob ');
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

 async getCustomerForAgent(agentId: string, userId: string) {

    // Check agent exists
    const agent = await this.agentProfileModel.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const refId = agent.referralCode?.toString();

    // Verify user belongs to this agent
    const user = await this.userModel
      .findOne({ _id: userId, refId })
      .select('-password -isEmailVerified -updatedAt')
      .lean();

    if (!user) {
      throw new ForbiddenException(
        'This customer does not belong to this agent'
      );
    }

    // Fetch appointments
    const appointments = await this.appointmentModel
      .find({ userId })
      .lean();

    if (!appointments.length) {
      return { user, appointments: [] };
    }

    // Collect productIds
    const allProductIds = appointments.flatMap(a => a.productIds || []);

    // Fetch ONLY sku + name from products
    const products = await this.productModel
      .find(
        { _id: { $in: allProductIds } },
        { sku: 1, name: 1, mrpPrice:1, image:1, gallery:1, categories:1,  goldSpecs:1, stoneSpecs:1}   // projection (only needed fields)
      )
      .lean();

    // Create map
    const productMap = {};
    products.forEach(p => {
      productMap[p._id.toString()] = p;
    });

    // Attach minimal product info to appointments
    const appointmentsWithProducts = appointments.map(app => ({
      ...app,
      products: (app.productIds || []).map(
        id => productMap[id.toString()] || null
      )
    }));

    //Final response
    return {
      user,
      appointments: appointmentsWithProducts
    };
  }

}