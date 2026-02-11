import { Injectable , BadRequestException, NotFoundException, ConflictException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../schema/appointment.schema';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';
import { AgentProfile , AgentProfileDocument} from 'src/modules/agents/schemas/agent.profile.schema';
import { Product, ProductDocument } from 'src/modules/products/schemas/product.schema';
import { AppointmentStatus } from '../dto/appoitment.dto';

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
  ) {}

  async getAdminAppointment() {
    // Return all appointments ordered by date and slot start time (upcoming first)
    return this.appointmentModel
      .find()
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


  async getAppointmentsById(appointmentid: string) {
    const appointment = await this.appointmentModel.findById(appointmentid).lean().exec();
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const [user, agent, products] = await Promise.all([
      this.UserModel.findById(appointment.userId).select('fullName email refId avatar').lean(),
      appointment.agentid
      ?this.AgentProfileModel.findOne({ referralCode: appointment.agentid }) 
          .select('name email phone referralCode')
          .lean()
      : Promise.resolve(null),
      this.ProductModel.find({
        _id: { $in: appointment.productIds || [] },
      }).select('name sku mrpPrice goldSpecs stoneSpecs').lean(),
    ]);

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
    // Validate Mongo ID
    if (!isValidObjectId(appointmentId)) {
      throw new BadRequestException('Invalid appointment ID');
    }

    // Validate Status Enum
    if (!Object.values(AppointmentStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    // Find Appointment
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    //  Prevent updating if already cancelled
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ConflictException(
        'Cannot update a cancelled appointment',
      );
    }

    // Prevent same status update
    if (appointment.status === status) {
      throw new ConflictException(
        `Appointment is already ${status}`,
      );
    }

    // Optional: Prevent updating past appointments
    const today = new Date().toISOString().split('T')[0];
    if (appointment.date < today) {
      throw new ConflictException(
        'Cannot update status of past appointment',
      );
    }
    
    //  Update
    appointment.status = status;
    await appointment.save();

    return appointment;
  }


}
