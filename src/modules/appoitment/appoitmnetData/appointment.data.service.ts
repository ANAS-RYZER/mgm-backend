import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../schema/appointment.schema';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';
import { AgentProfile , AgentProfileDocument} from 'src/modules/agents/schemas/agent.profile.schema';
import { Product, ProductDocument } from 'src/modules/products/schemas/product.schema';

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
      }).select('name sku description mrpPrice goldSpecs stoneSpecs').lean(),
    ]);

    return {
      ...appointment,
      userDetails: user,
      agentDetails: agent,
      productDetails: products,
    };

  }


  
  

}
