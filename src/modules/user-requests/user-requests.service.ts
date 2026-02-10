import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserRequest,
  UserRequestDocument,
  RequestStatus,
} from './schemas/user-request.schema';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { AgentProfile, AgentProfileDocument } from '../agents/schemas/agent.profile.schema';


@Injectable()
export class UserRequestsService {
  private readonly logger = new Logger(UserRequestsService.name);

  constructor(
    @InjectModel(UserRequest.name)
    private readonly userRequestModel: Model<UserRequestDocument>,
    @InjectModel(AgentProfile.name)
    private readonly agentProfileModel: Model<AgentProfileDocument>,
  ) {}

  // Create new user request
  async createRequest(
    userId: string,
    createUserRequestDto: CreateUserRequestDto,
  ): Promise<UserRequest> {
    try {
      let agentRefId: Types.ObjectId | undefined = undefined;
      let agentId: string | undefined = undefined;
      let referralCode: string | undefined = undefined;

      // Validate and find agent by referralCode if provided
      if (createUserRequestDto.agentReferralCode) {
        const agent = await this.agentProfileModel
          .findOne({
            referralCode: createUserRequestDto.agentReferralCode,
          })
          .select('_id agentId referralCode')
          .lean()
          .exec();

        if (!agent) {
          throw new BadRequestException(
            'Invalid agent referral code',
          );
        }

        agentRefId = new Types.ObjectId(agent._id);
        agentId = agent.agentId;
        referralCode = agent.referralCode;
      }

      // Destructure to remove agentReferralCode from DTO
      const { agentReferralCode, ...requestData } = createUserRequestDto;

      const newRequest = new this.userRequestModel({
        ...requestData,
        userId: new Types.ObjectId(userId),
        agentRefId,
        agentId,
        referralCode,
        status: RequestStatus.PENDING,
      });

      await newRequest.save();
      
      // Convert to object and remove agentId from response
      const requestObject = newRequest.toObject();
      return requestObject;
    } catch (error) {
      this.logger.error('Failed to create user request', error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create request');
    }
  }

  // Get all user requests (for admin)
  async getAllRequests(
    page: number = 1,
    limit: number = 10,
    status?: RequestStatus,
  ): Promise<{
    requests: UserRequest[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query = status ? { status } : {};

      const [requests, totalCount] = await Promise.all([
        this.userRequestModel
          .find(query)
          .populate('userId', 'fullName email avatar')
          .populate('agentRefId', 'name email phoneNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.userRequestModel.countDocuments(query),
      ]);

      return {
        requests,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      this.logger.error('Failed to fetch user requests', error.stack);
      throw new BadRequestException('Failed to fetch requests');
    }
  }

  // Get single request by ID (with ownership verification)
  async getRequestById(
    requestId: string,
    userId: string,
  ): Promise<UserRequest> {
    try {
      const request = await this.userRequestModel
        .findById(requestId)
        .populate('userId', 'fullName email avatar phoneNumber')
        .populate('agentRefId', 'name email phoneNumber')
        .lean()
        .exec();

      if (!request) {
        throw new NotFoundException(`Request with ID ${requestId} not found`);
      }

      // Verify that the request belongs to the authenticated user
      if (request.userId._id.toString() !== userId) {
        throw new NotFoundException(`Request with ID ${requestId} not found`);
      }

      return request;
    } catch (error) {
      this.logger.error('Failed to fetch request', error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch request');
    }
  }

  // Get requests by user
  async getRequestsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    requests: UserRequest[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        this.userRequestModel
          .find({ userId: new Types.ObjectId(userId) })
          .populate('agentRefId', 'name email phoneNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.userRequestModel.countDocuments({
          userId: new Types.ObjectId(userId),
        }),
      ]);

      return {
        requests,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      this.logger.error('Failed to fetch user requests', error.stack);
      throw new BadRequestException('Failed to fetch user requests');
    }
  }

  // Get requests by agent
  async getRequestsByAgent(
    agentId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    requests: UserRequest[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        this.userRequestModel
          .find({ agentRefId: new Types.ObjectId(agentId) })
          .populate('userId', 'fullName email avatar phoneNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.userRequestModel.countDocuments({
          agentRefId: new Types.ObjectId(agentId),
        }),
      ]);

      return {
        requests,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      this.logger.error('Failed to fetch agent requests', error.stack);
      throw new BadRequestException('Failed to fetch agent requests');
    }
  }

  // Update request
  async updateRequest(
    requestId: string,
    updateUserRequestDto: UpdateUserRequestDto,
  ): Promise<UserRequest> {
    try {
      const updateData: any = {};

      // Handle agentReferralCode validation if provided
      if (updateUserRequestDto.agentReferralCode) {
        const agent = await this.agentProfileModel
          .findOne({
            referralCode: updateUserRequestDto.agentReferralCode,
          })
          .select('_id agentId referralCode')
          .lean()
          .exec();

        if (!agent) {
          throw new BadRequestException('Invalid agent referral code');
        }

        updateData.agentRefId = new Types.ObjectId(agent._id);
        updateData.agentId = agent.agentId;
        updateData.referralCode = agent.referralCode;
      }

      // Add status if provided
      if (updateUserRequestDto.status) {
        updateData.status = updateUserRequestDto.status;

        // Set completedAt if status is changed to APPROVED
        if (updateUserRequestDto.status === RequestStatus.APPROVED) {
          updateData.completedAt = new Date();
        }
      }

      // Add notes if provided
      if (updateUserRequestDto.notes !== undefined) {
        updateData.notes = updateUserRequestDto.notes;
      }

      const updatedRequest = await this.userRequestModel
        .findByIdAndUpdate(requestId, updateData, {
          new: true,
          runValidators: true,
        })
        .populate('userId', 'fullName email avatar phoneNumber')
        .populate('agentRefId', 'name email phoneNumber')
        .lean()
        .exec();

      if (!updatedRequest) {
        throw new NotFoundException(`Request with ID ${requestId} not found`);
      }

      return updatedRequest;
    } catch (error) {
      this.logger.error('Failed to update request', error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update request');
    }
  }

  // Delete request
  async deleteRequest(requestId: string): Promise<void> {
    try {
      const result = await this.userRequestModel
        .findByIdAndDelete(requestId)
        .exec();

      if (!result) {
        throw new NotFoundException(`Request with ID ${requestId} not found`);
      }
    } catch (error) {
      this.logger.error('Failed to delete request', error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete request');
    }
  }

}

