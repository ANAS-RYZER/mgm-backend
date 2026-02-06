import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserRequestsService } from './user-requests.service';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRequestDto } from './dto/update-user-request.dto';
import { RequestStatus } from './schemas/user-request.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../admins/guards/admin-jwt-auth.guard';

@Controller('user-requests')
export class UserRequestsController {
  constructor(private readonly userRequestsService: UserRequestsService) {}

  // Create new user request (User must be authenticated)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createRequest(
    @Req() req: any,
    @Body() createUserRequestDto: CreateUserRequestDto,
  ) {
    const userId = req.user?.userId;
    const request = await this.userRequestsService.createRequest(
      userId,
      createUserRequestDto,
    );
    return {
      message: 'Request created successfully',
      data: request,
    };
  }

  // Get all requests (Admin only)
  @Get('adminlist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getAllRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: RequestStatus,
  ) {
    const result = await this.userRequestsService.getAllRequests(
      Number(page),
      Number(limit),
      status,
    );
    return {
      message: 'Requests fetched successfully',
      data: result.requests,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        limit: Number(limit),
      },
    };
  }

  // Get single request by ID (User can only get their own requests)
  @Get(':id/user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getRequestById(@Param('id') requestId: string, @Req() req: any) {
    const userId = req.user?.userId;
    const request = await this.userRequestsService.getRequestById(
      requestId,
      userId,
    );
    return {
      message: 'Request fetched successfully',
      data: request,
    };
  }

  // Get requests by authenticated user
  @Get('user/my-requests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getMyRequests(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user?.userId;
    const result = await this.userRequestsService.getRequestsByUser(
      userId,
      Number(page),
      Number(limit),
    );
    return {
      message: 'Requests fetched successfully',
      data: result.requests,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        limit: Number(limit),
      },
    };
  }

  // Get requests by agent (Agent)
  @Get('admin/agent/:agentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getRequestsByAgent(
    @Param('agentId') agentId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.userRequestsService.getRequestsByAgent(
      agentId,
      Number(page),
      Number(limit),
    );
    return {
      message: 'Agent requests fetched successfully',
      data: result.requests,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        limit: Number(limit),
      },
    };
  }

  // Update request (Admin only)
  @Put('admin/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async updateRequest(
    @Param('id') requestId: string,
    @Body() updateUserRequestDto: UpdateUserRequestDto,
  ) {
    const request = await this.userRequestsService.updateRequest(
      requestId,
      updateUserRequestDto,
    );
    return {
      message: 'Request updated successfully',
      data: request,
    };
  }

}

