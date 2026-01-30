import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Agent, AgentDocument, AgentStatus } from './schemas/agent.schema';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { ApproveAgentDto } from './dto/approve-agent.dto';
import { AgentLoginDto } from './dto/agent-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { generatePassword } from './utils/password-generator';
import { EmailService } from '../../infra/email/email.service';
import { AgentJwtService } from './services/agent-jwt.service';
import { AgentTokenStorageService } from './services/agent-token-storage.service';
import { AgentOtpService } from './services/agent-otp.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectModel(Agent.name)
    private readonly agentModel: Model<AgentDocument>,
    private readonly emailService: EmailService,
    private readonly agentJwtService: AgentJwtService,
    private readonly agentTokenStorageService: AgentTokenStorageService,
    private readonly agentOtpService: AgentOtpService,
  ) {}

  // Agent Registration (No password yet)
  async registerAgent(registerAgentDto: RegisterAgentDto): Promise<Agent> {
    // Check if agent already exists
    const existingAgent = await this.agentModel.findOne({
      email: registerAgentDto.email,
    });

    if (existingAgent) {
      throw new ConflictException('Agent with this email already exists');
    }

    // Create agent without password (status: pending)
    const newAgent = new this.agentModel({
      ...registerAgentDto,
      status: AgentStatus.PENDING,
    });

    await newAgent.save();

    // Return without password field
    const agentObject = newAgent.toObject();
    delete agentObject.password;
    return agentObject;
  }

  // Get all agents (for admin)
  async getAllAgents(status?: AgentStatus): Promise<Agent[]> {
    const filter = status ? { status } : {};
    return this.agentModel.find(filter).select('-password').lean();
  }

  // Get agent by ID
  async getAgentById(agentId: string): Promise<Agent> {
    const agent = await this.agentModel.findById(agentId).select('-password');
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  // Admin approves or rejects agent
  async updateAgentStatus(
    agentId: string,
    approveAgentDto: ApproveAgentDto,
  ): Promise<{ agent: Agent; password?: string }> {
    const agent = await this.agentModel.findById(agentId);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.status === AgentStatus.APPROVED) {
      throw new BadRequestException('Agent is already approved');
    }

    const { status, rejectionReason } = approveAgentDto;

    // If approving, generate password
    if (status === AgentStatus.APPROVED) {
      const generatedPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      agent.password = hashedPassword;
      agent.status = AgentStatus.APPROVED;
      agent.rejectionReason = undefined;
      (agent as any).ispasswordchanged = false; // Initial generated password
      (agent as any).isnewuser = true; // New agent with generated password

      await agent.save();

      // Send email with credentials
      try {
        await this.emailService.sendAgentCredentials(agent.email, {
          name: agent.name,
          email: agent.email,
          password: generatedPassword,
          loginUrl: process.env.AGENT_LOGIN_URL || 'http://localhost:3000/agents/login',
        });
        this.logger.log(`✅ Credentials email sent to ${agent.email}`);
      } catch (error) {
        // Don't throw error - agent is still approved
      }

      // TODO: Send SMS with credentials
      // await this.sendSMS(agent.phoneNumber, generatedPassword);

      const agentObject: any = agent.toObject();
      delete agentObject.password;

      return {
        agent: agentObject,
        password: generatedPassword, // Return plain password for admin to share
      };
    }

    // If rejecting
    if (status === AgentStatus.REJECTED) {
      if (!rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }
      agent.status = AgentStatus.REJECTED;
      agent.rejectionReason = rejectionReason;
      await agent.save();
    }

    const agentObject: any = agent.toObject();
    delete agentObject.password;

    return {
      agent: agentObject,
    };
  }

  // Agent Login with JWT tokens (supports email OR phoneNumber)
  async agentLogin(agentLoginDto: AgentLoginDto): Promise<{
    agent: Agent;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    message: string;
  }> {
    const { email, phoneNumber, password } = agentLoginDto;

    // Validate that at least one identifier is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Build query to find agent by email OR phoneNumber
    const query: any = {};
    if (email && phoneNumber) {
      query.$or = [{ email }, { phoneNumber }];
    } else if (email) {
      query.email = email;
    } else if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    // Find agent with password field
    const agent = await this.agentModel.findOne(query).select('+password');

    if (!agent) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (agent.status !== AgentStatus.APPROVED) {
      throw new UnauthorizedException(
        'Your account is not approved yet. Please contact admin.',
      );
    }

    if (!agent.password) {
      throw new UnauthorizedException(
        'No password set. Please contact admin.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, agent.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate session ID
    const sessionId = this.agentJwtService.generateSessionId();

    // Generate tokens
    const tokenPayload = {
      agentId: agent._id.toString(),
      email: agent.email,
      sessionId,
    };

    const accessToken = this.agentJwtService.generateAccessToken(tokenPayload);
    const refreshToken = this.agentJwtService.generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    await this.agentTokenStorageService.storeTokens(
      sessionId,
      agent._id.toString(),
      refreshToken,
    );

    // Return agent without password
    const agentObject = agent.toObject();
    delete agentObject.password;

    return {
      agent: agentObject,
      accessToken,
      refreshToken,
      sessionId,
      message: 'Login successful',
    };
  }

  // Agent resets password
  async resetPassword(
    agentId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = resetPasswordDto;

    const agent = await this.agentModel.findById(agentId).select('+password');

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.password) {
      throw new BadRequestException('No password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      agent.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    agent.password = hashedPassword;
    (agent as any).ispasswordchanged = true; // Mark as password changed
    (agent as any).isnewuser = false; // No longer a new user
    await agent.save();

    return { message: 'Password reset successfully' };
  }

  // Refresh access token
  async refreshAccessToken(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const { refreshToken, sessionId } = refreshTokenDto;

    // Verify refresh token
    let payload;
    try {
      payload = this.agentJwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Validate refresh token in storage
    const isValid = await this.agentTokenStorageService.validateRefreshToken(
      sessionId,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = this.agentJwtService.generateAccessToken({
      agentId: payload.agentId,
      email: payload.email,
      sessionId,
    });

    const newRefreshToken = this.agentJwtService.generateRefreshToken({
      agentId: payload.agentId,
      email: payload.email,
      sessionId,
    });

    // Update refresh token in storage
    await this.agentTokenStorageService.storeTokens(
      sessionId,
      payload.agentId,
      newRefreshToken,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // Logout agent
  async logout(sessionId: string): Promise<{ message: string }> {
    await this.agentTokenStorageService.deleteSession(sessionId);
    return { message: 'Logged out successfully' };
  }

  // Logout from all devices
  async logoutAll(agentId: string): Promise<{ message: string }> {
    await this.agentTokenStorageService.deleteAllAgentSessions(agentId);
    return { message: 'Logged out from all devices successfully' };
  }

  // Send OTP to agent email or phone
  async sendOtp(
    email?: string,
    phoneNumber?: string,
  ): Promise<{ message: string }> {
    // Validate at least one identifier is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Build query to find agent
    const query: any = {};
    if (email && phoneNumber) {
      query.$or = [{ email }, { phoneNumber }];
    } else if (email) {
      query.email = email;
    } else if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    // Check if agent exists
    const agent = await this.agentModel.findOne(query);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.status !== AgentStatus.APPROVED) {
      throw new BadRequestException('Only approved agents can verify');
    }

    // Send OTP to email or phone
    if (email) {
      await this.agentOtpService.sendOtpToEmail(email, agent.name);
      return { message: 'OTP sent successfully to your email' };
    } else if (phoneNumber) {
      await this.agentOtpService.sendOtpToPhone(phoneNumber, agent.name);
      return { message: 'OTP sent successfully to your phone number' };
    }

    return { message: 'OTP sent successfully' };
  }

  // Verify OTP and mark email/phone as verified
  async verifyOtp(
    otp: string,
    email?: string,
    phoneNumber?: string,
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }> {
    // Validate at least one identifier is provided
    if (!email && !phoneNumber) {
      throw new BadRequestException('Email or phone number is required');
    }

    // Build query to find agent
    const query: any = {};
    if (email && phoneNumber) {
      query.$or = [{ email }, { phoneNumber }];
    } else if (email) {
      query.email = email;
    } else if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }

    // Check if agent exists
    const agent = await this.agentModel.findOne(query);

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Verify OTP (email or phone)
    if (email) {
      await this.agentOtpService.verifyOTP(email, otp);
    } else if (phoneNumber) {
      await this.agentOtpService.verifyPhoneOTP(phoneNumber, otp);
    }

    // Mark email as verified
    (agent as any).isemailverified = true;
    await agent.save();

    // Generate tokens for the agent
    const sessionId = this.agentJwtService.generateSessionId();

    const tokenPayload = {
      agentId: agent._id.toString(),
      email: agent.email,
      sessionId,
    };

    const accessToken = this.agentJwtService.generateAccessToken(tokenPayload);
    const refreshToken = this.agentJwtService.generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    await this.agentTokenStorageService.storeTokens(
      sessionId,
      agent._id.toString(),
      refreshToken,
    );

    return {
      message: 'Verification successful',
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  // TODO: Implement SMS sending
  // private async sendSMS(phoneNumber: string, password: string): Promise<void> {
  //   // Integrate with SMS provider (Twilio, AWS SNS, etc.)
  //   this.logger.log(`SMS would be sent to ${phoneNumber} with password: ${password}`);
  // }
}

