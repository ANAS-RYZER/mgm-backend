import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum AgentStatus {
  PENDING = "pending",
  VIEWED = "viewed",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Schema({ _id: false })
export class BankDetails {
  @Prop({ required: true })
  accountHolderName: string;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true })
  ifscCode: string;

  @Prop({ required: true })
  accountType: string;

  @Prop()
  branchName?: string;
}

export const BankDetailsSchema = SchemaFactory.createForClass(BankDetails);

@Schema({ _id: false })
export class GovernmentId {
  @Prop({ enum: ["PAN", "AADHAAR"], required: true })
  type: "PAN" | "AADHAAR";

  @Prop({ required: true })
  documentUrl: string; // S3 / Cloudinary URL
}

export const GovernmentIdSchema = SchemaFactory.createForClass(GovernmentId);

export type AgentProfileDocument = AgentProfile & Document;

@Schema({ timestamps: true })
export class AgentProfile {
  @Prop({ required: true })
  agentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ type: BankDetailsSchema, required: true })
  bankDetails: BankDetails;

  @Prop({ type: GovernmentIdSchema, required: true })
  governmentId: GovernmentId;

  @Prop({ default: true })
  isnewuser: boolean;

  @Prop({ default: false })
  isadmin: boolean;

  @Prop({ default: false })
  ispasswordchanged: boolean;

  @Prop({ unique: true, sparse: true })
  referralCode?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AgentProfileSchema = SchemaFactory.createForClass(AgentProfile);
