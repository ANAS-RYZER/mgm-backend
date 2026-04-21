import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { AdminJwtAuthGuard } from "../admins/guards/admin-jwt-auth.guard";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // Create Order with appointmentId in query
  @Post()
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Query("appointmentId") appointmentId: string,
    @Body() createDto: CreateOrderDto,
  ) {
    const order = await this.orderService.create(appointmentId, createDto);

    return {
      success: true,
      message: "Order recorded successfully",
      data: order,
    };
  }

  //  Update Order
  @Put(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async update(@Param("id") id: string, @Body() updateDto: UpdateOrderDto) {
    const order = await this.orderService.update(id, updateDto);

    return {
      success: true,
      message: "Order updated successfully",
      data: { orderId: order._id },
    };
  }

  // ✅ Get Single Order
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async findOne(@Param("id") id: string) {
    const order = await this.orderService.findOne(id);

    return {
      success: true,
      message: "Order fetched successfully",
      data: order,
    };
  }

  // get all orders
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async getAllOrders(
    @Query("search") search?: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    const orders = await this.orderService.getAllOrders(
      search,
      Number(page),
      Number(limit),
    );
    return {
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    };
  }
}
