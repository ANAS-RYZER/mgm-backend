import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage } from "mongoose";
import { Appointment, AppointmentDocument } from "../schema/appointment.schema";

@Injectable()
export class AppoitmenDatatService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}
 async getAdminAppointment(search?: string) {

  const adminAppointmentPipeline: PipelineStage[] = [

    {
      $addFields: {
        userObjectId: { $toObjectId: "$userId" },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "userObjectId",
        foreignField: "_id",
        as: "user",
      },
    },

    { $unwind: "$user" },

    {
      $lookup: {
        from: "agentprofiles",
        let: { refId: "$user.refId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$agentId", "$$refId"] },
            },
          },
          {
            $project: {
              name: 1,
              email: 1,
              agentId: 1,
              phoneNumber: 1,
            },
          },
        ],
        as: "partner",
      },
    },

    {
      $unwind: {
        path: "$partner",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 🔥 GLOBAL SEARCH STAGE
    ...(search
      ? [
          {
            $match: {
              $or: [
                { "user.fullName": { $regex: search, $options: "i" } },
                { "user.email": { $regex: search, $options: "i" } },
                { "partner.agentId": { $regex: search, $options: "i" } },
                { date: { $regex: search, $options: "i" } },
                { slotCode: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
      : []),

    {
      $project: {
        userId: 0,
        userObjectId: 0,
        "user.refId": 0,
        "user.password": 0,
        "user.__v": 0,
      },
    },

    { $sort: { date: 1, slotStartTime: 1 } },

    {
      $facet: {
        appointments: [{ $match: {} }],

        totalAppointments: [{ $count: "count" }],

        todayAppointments: [
          {
            $match: {
              date: new Date().toISOString().slice(0, 10),
            },
          },
          { $count: "count" },
        ],
      },
    },

    {
      $project: {
        appointments: 1,
        totalAppointments: {
          $ifNull: [{ $arrayElemAt: ["$totalAppointments.count", 0] }, 0],
        },
        todayAppointments: {
          $ifNull: [{ $arrayElemAt: ["$todayAppointments.count", 0] }, 0],
        },
      },
    },
  ];

  const result = await this.appointmentModel
    .aggregate(adminAppointmentPipeline)
    .exec();

  return result[0];
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
