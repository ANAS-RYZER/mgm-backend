import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AgentService } from "../agent.service";
import { Model } from "mongoose";
import { AgentDocument } from "../schemas/agent.schema";
import { InjectModel } from "@nestjs/mongoose";
import {  AgentProfile, AgentProfileDocument } from "../schemas/agent.profile.schema";
import {  User, UserDocument } from "src/modules/users/schemas/user.schema";
import { Product, ProductDocument } from "src/modules/products/schemas/product.schema";
import { Order, OrderDocument } from "src/modules/order/schema/order.schema";
@Injectable()
export class AgentDashboardService {
  constructor(@InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfileDocument>
, @InjectModel(User.name) private userModel: Model<UserDocument>,
  @InjectModel(Product.name) private productModel: Model<ProductDocument>,
 @InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

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

    // Fetch user AND verify belongs to agent
    const user = await this.userModel
      .findOne({ _id: userId, refId:refId  })   
      .select('-password -isEmailVerified -updatedAt')
      .lean();

    if (!user) {
      throw new ForbiddenException('This customer does not belong to this agent');
    }

    // Fetch orders of this user
    const orders = await this.orderModel
      .find({ userId })
      .lean();

    if (!orders.length) {
      return { user, orders: [] };
    }

    // Collect SKUs
    const allSkus = orders.flatMap(o => o.productSku || []);

    // Fetch products
    const products = await this.productModel
      .find({ productSku: { $in: allSkus } })
      .lean();

    const productMap = {};
    products.forEach(p => {
      productMap[p.sku] = p;
    });

    // Attach products
    const ordersWithProducts = orders.map(order => ({
      ...order,
      products: (order.productSku || []).map(
      sku => productMap[sku] || null
      )
    }));

    // Final response
    return {
      user,
      orders: ordersWithProducts
    };
  }

}