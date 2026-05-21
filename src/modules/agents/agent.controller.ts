import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AgentService } from "./agent.service";
import { RegisterAgentDto } from "./dto/register-agent.dto";
import { ApproveAgentDto } from "./dto/approve-agent.dto";
import { AgentLoginDto } from "./dto/agent-login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { AgentStatus } from "./schemas/agent.schema";
import { AdminJwtAuthGuard } from "../admins/guards/admin-jwt-auth.guard";
import { AgentJwtAuthGuard } from "./guards/agent-jwt-auth.guard";

@Controller("agents")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // Agent Registration (Public - No password)
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async registerAgent(@Body() registerAgentDto: RegisterAgentDto) {
    const agent = await this.agentService.registerAgent(registerAgentDto);
    return {
      message: "Agent registration successful. Waiting for admin approval.",
      data: agent,
    };
  }

  // Get all agents (Admin only)
  @Get("/applications")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getAllApplications(@Query("status") status?: AgentStatus, @Query("search") search?: string) {
    const agents = await this.agentService.getAllApplications(status, search);
    return {
      message: "Agents fetched successfully",
      data: agents,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getAllAgents(
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    const result = await this.agentService.getAllAgents(
      search,
      Number(page),
      Number(limit),
    );

    return {
      message: "Agents fetched successfully",
      data: result.agents,
      pagination: {
        page: result.page,
        limit: result.limit,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    };
  }

  // Get agent by ID (Admin only)
  @Get("/applications/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getAgentById(@Param("id") agentId: string) {
    const agent = await this.agentService.getAgentById(agentId);
    return {
      message: "Agent fetched successfully",
      data: agent,
    };
  }

  // Admin approves/rejects agent (Admin only)
  @Put("/application/:id/status")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async updateAgentStatus(
    @Param("id") agentId: string,
    @Body() approveAgentDto: ApproveAgentDto,
  ) {
    const result = await this.agentService.updateAgentStatus(
      agentId,
      approveAgentDto,
    );

    if (result.password) {
      return {
        message: `Agent approved successfully. Password generated: ${result.password}`,
        data: result.agent,
        credentials: {
          email: result.agent.email,
          password: result.password,
          note: "Please share these credentials with the agent via email/SMS",
        },
      };
    }

    return {
      message: "Agent status updated successfully",
      data: result.agent,
    };
  }

  // Agent Login (Public) - Returns JWT tokens
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async agentLogin(@Body() agentLoginDto: AgentLoginDto) {
    const result = await this.agentService.agentLogin(agentLoginDto);
    return result
  }

  // Agent Reset Password (Requires agent to be logged in)
  @Put(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgentJwtAuthGuard)
  async resetPassword(
    @Param("id") agentId: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: any,
  ) {
    // Verify agent is resetting their own password
    if (req.agent.agentId !== agentId) {
      throw new UnauthorizedException("You can only reset your own password");
    }

    const result = await this.agentService.resetPassword(
      agentId,
      resetPasswordDto,
    );
    return result;
  }

  // Refresh Access Token (Public)
  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.agentService.refreshAccessToken(refreshTokenDto);
    return {
      message: "Token refreshed successfully",
      data: result,
    };
  }

  // Logout (Requires agent to be logged in)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgentJwtAuthGuard)
  async logout(@Body("sessionId") sessionId: string) {
    const result = await this.agentService.logout(sessionId);
    return result;
  }

  // Logout from all devices (Requires agent to be logged in)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AgentJwtAuthGuard)
  async logoutAll(@Req() req: any) {
    const agentId = req.agent.agentId;
    const result = await this.agentService.logoutAll(agentId);
    return result;
  }

  // Send OTP to agent email or phone (Public)
  @Post("send-otp")
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    const result = await this.agentService.sendOtp(
      sendOtpDto.email,
      sendOtpDto.phoneNumber,
    );
    return result;
  }

  // Verify OTP and get tokens (Public)
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const result = await this.agentService.verifyOtp(
      verifyOtpDto.otp,
      verifyOtpDto.email,
      verifyOtpDto.phoneNumber,
    );
    return result;
  }

  // Get agent by email (Public)
  @Get(":id/application")
  @HttpCode(HttpStatus.OK)
  async getAgentApplication(@Param("id") agentId: string) {
    const agent = await this.agentService.getAgentByEmail(agentId);
    return agent;
  }
}
