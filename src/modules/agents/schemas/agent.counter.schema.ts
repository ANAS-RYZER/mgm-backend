import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'agentcounters' })
export class AgentCounter {
  @Prop({ required: true, unique: true })
  key: string; // "agent-2026"

  @Prop({ default: 0 })
  seq: number;
}

export const AgentCounterSchema = SchemaFactory.createForClass(AgentCounter);
