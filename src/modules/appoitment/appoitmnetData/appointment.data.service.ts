import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, PipelineStage, isValidObjectId } from "mongoose";
import { Appointment, AppointmentDocument } from "../schema/appointment.schema";
import { User, UserDocument } from "../../users/schemas/user.schema";
import {
  AgentProfile,
  AgentProfileDocument,
} from "src/modules/agents/schemas/agent.profile.schema";
import {
  Product,
  ProductDocument,
} from "src/modules/products/schemas/product.schema";
import { AppointmentStatus } from "../dto/appoitment.dto";

@Injectable()
export class AppoitmenDatatService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(User.name)
    private readonly UserModel: Model<UserDocument>,
    @InjectModel(AgentProfile.name)
    private readonly AgentProfileModel: Model<AgentProfileDocument>,
    @InjectModel(Product.name)
    private readonly ProductModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel : Model<UserDocument>,

  ) {}
  async getAdminAppointment(
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

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
          // PAGINATED DATA
          appointments: [
            { $skip: skip },
            { $limit: limit },
          ],

          // TOTAL COUNT
          totalAppointments: [{ $count: "count" }],

          // TODAY COUNT
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

    const result = await this.appointmentModel.aggregate(adminAppointmentPipeline);

    return {
      ...result[0],
      page,
      limit,
      hasNextPage: skip + limit < result[0].totalAppointments,
      hasPreviousPage: page > 1,
      totalPages: Math.ceil(result[0].totalAppointments / limit),
    };
  }

  async getAgentAppointments(agentId: string, referralCode: string) {
    const or: Record<string, string>[] = [];

    if (referralCode) {
      or.push(
        { referralCode },
        { agentId: referralCode },
        { agentid: referralCode },
      );
    }

    if (!referralCode && agentId) {
      or.push({ agentId }, { agentid: agentId });
    }

    const filter = or.length ? { $or: or } : {};

    const appointments = await this.appointmentModel
      .find(filter)
      .sort({ date: 1, slotStartTime: 1 })
      .lean()
      .exec();

    // NEW LOGIC STARTS HERE

    const userIds = appointments.map((a) => a.userId);

    // get users
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select("fullName email")
      .lean();

    const userMap = new Map(
      users.map((u) => [u._id.toString(), u]),
    );

    // get product counts
    const productCounts = await this.ProductModel.aggregate([
      {
        $match: {
          userId: { $in: userIds },
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
        },
      },
    ]);

  
    // merge everything
    const result = appointments.map((appt) => {
      const user = userMap.get(appt.userId.toString());

      return {
        ...appt,
        userName: user?.fullName || "",
        email: user?.email || "",
        productCount: appt.productIds?.length || 0,
      };
    });

    return result;
  }

  async getAppointmentsById(appointmentid: string) {
    const appointment = await this.appointmentModel
      .findById(appointmentid)
      .lean()
      .exec();
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    console.log("Fetched appointment:", appointment);
    const refId =
      appointment?.referralCode ||
      appointment?.agentId ||
      appointment?.agentid ||
      "";
      console.log("RefId for agent lookup:", refId);

    const [user, agent, products] = await Promise.all([
      this.UserModel.findById(appointment.userId)
        .select("fullName email refId avatar")
        .lean(),
      refId
        ? this.AgentProfileModel.findOne({ agentId: refId })
            .select("name email phoneNumber referralCode agentId")
            .lean()
        : Promise.resolve(null),
      this.ProductModel.find({
        _id: { $in: appointment.productIds || [] },
      })
        .select("name sku mrpPrice goldSpecs stoneSpecs image makingChanges cgst netprice grossPrice discountedPrice discountedPercentage sgst va")
        .lean(),
    ]);
    console.log({ user, agent, products });

    return {
      ...appointment,
      userDetails: user,
      agentDetails: agent,
      productDetails: products,
    };
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
  ) {
    //Validate Mongo ID
    if (!isValidObjectId(appointmentId)) {
      throw new BadRequestException("Invalid appointment ID");
    }

    //Validate Status Enum
    if (!Object.values(AppointmentStatus).includes(status)) {
      throw new BadRequestException("Invalid status value");
    }

    //Find Appointment
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException("Appointment not found");
    }

    // Prevent updating if already cancelled
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException("Cannot update a cancelled appointment");
    }

    // Prevent same status update
    if (appointment.status === status) {
      throw new ConflictException(`Appointment is already ${status}`);
    }

    // Optional: Prevent updating past appointments
    const today = new Date().toISOString().split("T")[0];
    if (appointment.date < today) {
      throw new ConflictException("Cannot update status of past appointment");
    }

    //  Update
    appointment.status = status;
    await appointment.save();

    return appointment;
  }


}
