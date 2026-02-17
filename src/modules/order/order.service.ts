import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Appointment, AppointmentDocument } from '../appoitment/schema/appointment.schema'
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { AgentProfile, AgentProfileDocument } from '../agents/schemas/agent.profile.schema';
import { AgentCommission, AgentCommissionDocument } from '../agents/schemas/agent.commission.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @InjectModel(AgentCommission.name)
    private agentCommissionModel: Model<AgentCommissionDocument>,

  ) {}

  // Create Order
  async create(appointmentId: string, createDto: CreateOrderDto) {
    //  Check appointment exists
    const appointment = await this.appointmentModel.findById(appointmentId);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const products = await this.productModel
        .find({ sku: { $in: createDto.productSku } })
        .lean();


    // Create order using appointment data
    const order = await this.orderModel.create({
      appointmentId: new Types.ObjectId(appointmentId),
      userId: appointment.userId,
      agentId: appointment.agentid,
      productSku: createDto.productSku,
      totalPrice: createDto.totalPrice,
      status: OrderStatus.CREATE_ORDER,
    });

    return {
        order,
        products,
        }
  }

  private async createAgentCommission(order: OrderDocument) {
    // Safety check
    if (!order.totalPrice|| !order.userId) return;

    //  Find agent using referralCode stored in order.agentId
    const agent = await this.agentProfileModel
        .findOne({ referralCode: order.agentId })
        .lean()
        .exec();

    if (!agent) return;

    const commissionPercentage = 2;

    const commissionAmount =
        (order.totalPrice * commissionPercentage) / 100;

    // Prevent duplicate commission
    const existingCommission = await this.agentCommissionModel.findOne({
        orderId: order._id,
    });

    if (existingCommission) return;

    // Store agentId AND referralCode
    await this.agentCommissionModel.create({
        orderId: order._id,
        agentId: agent._id,   
        userId: order.userId,          
        referralCode: agent.referralCode, 
        totalOrderAmount: order.totalPrice,
        commissionPercentage,
        commissionAmount,
        isPaid: false,
    });
    }


  // Update Order
  async update(orderId: string, updateDto: UpdateOrderDto) {
  const order = await this.orderModel.findById(orderId);

    if (!order) {
        throw new NotFoundException('Order not found');
    }

    // Check productSku exists in Product model
    if (updateDto.productSku && updateDto.productSku.length > 0) {
        const products = await this.productModel.find({
        sku: { $in: updateDto.productSku },
        });

        if (products.length !== updateDto.productSku.length) {
        throw new BadRequestException('One or more product SKUs do not exist');
        }

        order.productSku = updateDto.productSku;
    }

    if (updateDto.totalPrice !== undefined) {
        order.totalPrice = updateDto.totalPrice;
    }

    //  Store previous status before updating
    const previousStatus = order.status;

    if (updateDto.status) {
        order.status = updateDto.status;
    }

    const updatedOrder = await order.save();

    // Automatically create commission
    if (
        previousStatus !== OrderStatus.ORDER_SUCCESS &&   // prevent duplicate
        updateDto.status === OrderStatus.ORDER_SUCCESS &&
        order.agentId
    ) {
        await this.createAgentCommission(order);
    }

    return updatedOrder;
    }



  // Get Single Order
  async findOne(orderId: string) {
  const order = await this.orderModel
    .findById(orderId)
    .populate('appointmentId')
    .populate('userId', 'fullName email avatar')
    .lean()
    .exec();

    if (!order) {
        throw new NotFoundException('Order not found');
    }

    //  Get Agent Details
    let agentDetails: any = null;

    if (order.agentId) {
        agentDetails = await this.agentProfileModel
        .findOne({ referralCode: order.agentId }, 'fullName email')
        .lean()
        .exec();
    }

    // Get Product Details using SKU
    let productDetails: any[] = [];

    if (order.productSku && order.productSku.length > 0) {
        productDetails = await this.productModel
        .find({ sku: { $in: order.productSku } })
        .lean()
        .exec();
    }

    return {
        ...order,
        agentDetails,
        productDetails,
    };
    }


}
