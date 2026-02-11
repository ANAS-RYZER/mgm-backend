import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Appointment, AppointmentDocument } from "../schema/appointment.schema";

@Injectable()
export class AppoitmenDatatService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}
  async getAdminAppointment() {
    return this.appointmentModel
      .find()
      .populate({
        path: "userId",
        select: "name email agentId refId",
        populate: {
          path: "agentId",
          model: "AgentProfile",
          select: "firstName lastName email",
        },
      })
      .populate("productIds", "title price")
      .sort({ date: 1, slotStartTime: 1 })
      .lean()
      .exec();
  }

  async getAgentAppointments(agentId: string, referralCode: string) {
    const filter: Record<string, string> = {};
    if (agentId) filter.agentId = agentId;
    if (referralCode) filter.referralCode = referralCode;

    return this.appointmentModel
      .find(filter)
      .sort({ date: 1, slotStartTime: 1 })
      .lean()
      .exec();
  }
}
