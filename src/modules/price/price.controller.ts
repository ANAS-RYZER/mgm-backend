import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PriceService } from './price.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { AdminJwtAuthGuard } from '../admins/guards/admin-jwt-auth.guard';

@Controller('prices')
@UseGuards(AdminJwtAuthGuard)
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPrice(@Body() createPriceDto: CreatePriceDto) {
    const price = await this.priceService.createPrice(createPriceDto);
    return {
      message: 'Price created successfully',
      data: price,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllPrices() {
    const result = await this.priceService.getAllPrices();
    return {
      message: 'Prices fetched successfully',
      data: result.data,
      count: result.count,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePrice(
    @Param('id') priceId: string,
    @Body() updatePriceDto: UpdatePriceDto,
  ) {
    const price = await this.priceService.updatePrice(priceId, updatePriceDto);
    return {
      message: 'Price updated successfully',
      data: price,
    };
  }

}

