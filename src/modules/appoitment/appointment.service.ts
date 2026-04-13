import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { CreateAppointmentDto } from "./dto/appoitment.dto";
import { Appointment, AppointmentDocument } from "./schema/appointment.schema";
import { Slot, SlotDocument } from "./schema/slot.schema";
import { SLOT_TIME_MAP } from "./constant/time.slot";
import { AppointmentStatus } from "../appoitment/dto/appoitment.dto";
import { createDecipheriv } from "crypto";

@Injectable()
export class AppoitmentService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,
  ) {}

  async getSlots(date: string) {
    const baseSlots = [
      { code: "MORNING", time: "10:00 - 13:00" },
      { code: "EVENING", time: "14:00 - 17:00" },
      { code: "NIGHT", time: "17:30 - 20:30" },
    ];
    const MAX_BOOKINGS = 20;

    // 1️⃣ Fetch slot docs for the date
    const slotDocs = await this.slotModel.find({ date }).lean();

    // 2️⃣ Convert DB data to map
    const slotMap = new Map(
      slotDocs.map((slot) => [slot.slotCode, slot.bookedCount]),
    );

    const now = new Date();

    const selectedDate = new Date(date);
    const isToday = now.toDateString() === selectedDate.toDateString();

    const getSlotEndDateTime = (timeRange: string) => {
      const [, end] = timeRange.split(" - "); // 13:00

      const [hours, minutes] = end.split(":").map(Number);

      const slotEnd = new Date(selectedDate);
      slotEnd.setHours(hours, minutes, 0, 0);

      return slotEnd;
    };

    // 3️⃣ Merge DB + base slots
    return baseSlots.map((slot) => {
      const bookedCount = slotMap.get(slot.code) || 0;
      let isAvailable = bookedCount < MAX_BOOKINGS;
      if (isToday) {
        const slotEndTime = getSlotEndDateTime(slot.time);

        if (now > slotEndTime) {
          isAvailable = false;
        }
      }

      return {
        slotCode: slot.code,
        time: slot.time,
        maxBookings: 20,
        bookedCount,
        availableCount: 20 - bookedCount,
        isAvailable: isAvailable,
      };
    });
  }

  async createAppointment(dto: CreateAppointmentDto, userId) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // 1️⃣ Increment slot only if space available
      const slot = await this.slotModel.findOneAndUpdate(
        {
          date: dto.date,
          slotCode: dto.slotCode,
          bookedCount: { $lt: 20 },
        },
        { $inc: { bookedCount: 1 } },
        { new: true, upsert: true, session },
      );

      if (!slot) {
        throw new Error("Slot is fully booked");
      }

      const slotTime = SLOT_TIME_MAP[dto.slotCode];
      console.log(dto, "slot time");

      // 2️⃣ Create appointment (store referralCode for agent filtering)
      const appointment = await this.appointmentModel.create(
        [
          {
            userId: userId,
            date: dto.date,
            slotCode: dto.slotCode,
            slotStartTime: slotTime.start,
            slotEndTime: slotTime.end,
            visitType: "STORE",
            productIds: dto.productIds || [],
            status: "CONFIRMED",
            ...(dto.referralCode && { referralCode: dto.referralCode }),
            // Backwards-compat with older DB field naming
            ...(dto.referralCode && { agentid: dto.referralCode }),
          },
        ],
        { session },
      );
      console.log(appointment, "appointment");

      await session.commitTransaction();
      session.endSession();

      // 3️⃣ Notify admin
      this.notifyAdmin(appointment[0]);

      return {
        message: "Appointment booked successfully",
        appointmentId: appointment[0]._id,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  notifyAdmin(appointment: any) {
    console.log("🔔 New Store Appointment", appointment);
  }

  async getAppointmentsByUser(
    userId: string,
    filter: "all" | "upcoming" | "history",
  ) {
    const now = new Date();

    const pipeline: any[] = [
      {
        $match: {
          userId: userId,
        },
      },

      // Create dateTime
      {
        $addFields: {
          dateTime: {
            $dateFromString: {
              dateString: {
                $concat: ["$date", "T", "$slotStartTime"],
              },
            },
          },
        },
      },

      // Convert string[] → ObjectId[]
      {
        $addFields: {
          productObjectIds: {
            $map: {
              input: "$productIds",
              as: "pid",
              in: { $toObjectId: "$$pid" },
            },
          },
        },
      },

      // Lookup products
      {
        $lookup: {
          from: "products",
          localField: "productObjectIds",
          foreignField: "_id",
          as: "products",
        },
      },

      // Keep only required product fields
      {
        $addFields: {
          products: {
            $map: {
              input: "$products",
              as: "p",
              in: {
                name: "$$p.name",
                sku: "$$p.sku",
                mrpPrice: "$$p.mrpPrice",
                image: "$$p.image",
              },
            },
          },
        },
      },
    ];

    // 🔥 Filters
    if (filter === "upcoming") {
      pipeline.push({
        $match: {
          dateTime: { $gt: now },
          status: { $ne: "CANCELLED" },
        },
      });
    }

    if (filter === "history") {
      pipeline.push({
        $match: {
          dateTime: { $lt: now },
        },
      });
    }

    // 🧹 Clean response
    pipeline.push({
      $project: {
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
        agentid: 0,
        productObjectIds: 0,
        productIds:0,
      },
    });


    const result = await this.appointmentModel.aggregate(pipeline);
   console.log(result, "user appointments");
    return {
      success: true,
      count: result.length,
      data: result,
    };
  }
}
