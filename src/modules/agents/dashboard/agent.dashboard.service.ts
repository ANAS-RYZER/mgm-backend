import { Injectable, NotFoundException } from "@nestjs/common";
import { AgentService } from "../agent.service";
import { Model } from "mongoose";
import { AgentDocument } from "../schemas/agent.schema";
import { InjectModel } from "@nestjs/mongoose";
import {  AgentProfile, AgentProfileDocument } from "../schemas/agent.profile.schema";
import {  User, UserDocument } from "src/modules/users/schemas/user.schema";
@Injectable()
export class AgentDashboardService {
  constructor(@InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfileDocument>
, @InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}