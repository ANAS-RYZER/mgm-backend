import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { User } from "./schemas/user.schema";
import { FilterQuery, Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import {
  Appointment,
  AppointmentDocument,
} from "../appoitment/schema/appointment.schema";
import {
  Wishlist,
  WishlistDocument,
} from "../wishlist/schemas/wishlist.schema";
import { AppointmentStatus } from "../appoitment/dto/appoitment.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select("-password");
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  /** Match appointments whether `userId` was stored as ObjectId or as a string (legacy). */
  private appointmentUserMatch(
    userId: string,
  ): FilterQuery<AppointmentDocument> {
    if (!userId?.trim()) {
      throw new BadRequestException("User id is required");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }
    const oid = new Types.ObjectId(userId);
    return {
      $or: [{ userId: oid }, { userId }],
    };
  }

  private wishlistUserMatch(userId: string): FilterQuery<WishlistDocument> {
    if (!userId?.trim()) {
      throw new BadRequestException("User id is required");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }
    const oid = new Types.ObjectId(userId);
    return {
      $or: [{ userId: oid }, { userId }],
    };
  }

  /**
   * Dashboard aggregates for the logged-in user: all appointments, wishlist size,
   * completed store visits (ISVISITED / ISPURCHASED on STORE), and recent bookings.
   */
  async getUserDashboard(userId: string) {
    const byUser = this.appointmentUserMatch(userId);
    const byWishlistUser = this.wishlistUserMatch(userId);

    const [totalAppointments, wishlistCount, storeVisitCount] =
      await Promise.all([
        this.appointmentModel.countDocuments(byUser),
        this.wishlistModel.countDocuments(byWishlistUser),
        this.appointmentModel.countDocuments({
          ...byUser,
          visitType: "STORE",
          status: {
            $in: [AppointmentStatus.ISVISITED, AppointmentStatus.ISPURCHASED],
          },
        }),
      ]);
    return {
      message: "Dashboard fetched successfully",
      data: {
        totalAppointments,
        wishlistCount,
        storeVisitCount,
      },
    };
  }

  async getMyWishlist(userId: string) {
    const byWishlistUser = this.wishlistUserMatch(userId);
    const wishlist = await this.wishlistModel.aggregate([
      { $match: byWishlistUser },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $project: {
          _id: 0,
          wishlistId: "$_id",
          productId: 1,
          productDetails: { $arrayElemAt: ["$product", 0] },
        },
      },
      { $sort: { wishlistId: -1 } },
    ]);
    return {
      message: "Wishlist fetched successfully",
      data: wishlist,
    };
  }
}
