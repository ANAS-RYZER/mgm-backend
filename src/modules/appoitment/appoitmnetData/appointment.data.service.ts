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
    // Appointments may store the agent reference under different fields.
    // Prefer referralCode (coming from auth guard -> DB) to find the agent's appointments.
    const or: Record<string, string>[] = [];

    if (referralCode) {
      or.push(
        { referralCode },
        { agentId: referralCode },
        // backwards-compat with older DB field naming
        { agentid: referralCode },
      );
    }

    // Fallback: if caller only has agentId, try matching legacy fields too
    if (!referralCode && agentId) {
      or.push({ agentId }, { agentid: agentId });
    }

    const filter = or.length ? { $or: or } : {};

    return this.appointmentModel
      .find(filter)
      .sort({ date: 1, slotStartTime: 1 })
      .lean()
      .exec();
  }
  
  

}
