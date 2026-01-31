import { IsEnum, IsString, IsOptional } from 'class-validator';
import { AgentStatus } from '../schemas/agent.schema';

export class ApproveAgentDto {
  @IsEnum(AgentStatus)
  status: AgentStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

