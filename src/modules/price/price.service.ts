import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price, PriceDocument } from './schemas/price.schema';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  constructor(
    @InjectModel(Price.name)
    private readonly priceModel: Model<PriceDocument>,
  ) {}

  async createPrice(createPriceDto: CreatePriceDto): Promise<Price> {
    try {
      // Check if price with the same name already exists
      const existingPrice = await this.priceModel
        .findOne({ name: createPriceDto.name })
        .lean()
        .exec();

      if (existingPrice) {
        throw new BadRequestException(
          `Price with name "${createPriceDto.name}" already exists`,
        );
      }

      const newPrice = new this.priceModel(createPriceDto);
      await newPrice.save();

      return newPrice.toObject();
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create price');
    }
  }

  async getAllPrices(): Promise<{
    data: Record<string, Array<{ name: string; price: number }>>;
    count: number;
  }> {
    try {
      const prices = await this.priceModel
        .find()
        .select('name price type -_id')
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Group prices by type
      const groupedPrices: Record<
        string,
        Array<{ name: string; price: number }>
      > = {};

      prices.forEach((price: any) => {
        const type = price.type;
        if (!groupedPrices[type]) {
          groupedPrices[type] = [];
        }
        groupedPrices[type].push({
          name: price.name,
          price: price.price,
        });
      });

      return {
        data: groupedPrices,
        count: prices.length,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch prices');
    }
  }



  async updatePrice(
    priceId: string,
    updatePriceDto: UpdatePriceDto,
  ): Promise<Price> {
    try {
      // Check if price exists
      const existingPrice = await this.priceModel.findById(priceId).exec();

      if (!existingPrice) {
        throw new NotFoundException(`Price with ID ${priceId} not found`);
      }

      // If updating name, check for duplicates
      if (updatePriceDto.name && updatePriceDto.name !== existingPrice.name) {
        const duplicatePrice = await this.priceModel
          .findOne({ name: updatePriceDto.name })
          .lean()
          .exec();

        if (duplicatePrice) {
          throw new BadRequestException(
            `Price with name "${updatePriceDto.name}" already exists`,
          );
        }
      }

      const updatedPrice = await this.priceModel
        .findByIdAndUpdate(priceId, updatePriceDto, {
          new: true,
          runValidators: true,
        })
        .select('-__v')
        .lean()
        .exec();

      if (!updatedPrice) {
        throw new NotFoundException(`Price with ID ${priceId} not found`);
      }

      return updatedPrice;
    } catch (error) {
      this.logger.error('Failed to update price', error.stack);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update price');
    }
  }

  
}

