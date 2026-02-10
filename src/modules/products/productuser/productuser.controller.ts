import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ProductsUserService } from "./productuser.service";
import { OptionalJwtAuthGuard } from "../../auth/guards/optional-jwt-auth.guard";
import { Categories } from "../interfaces/product.interface";


@Controller("userproducts")
export class ProductsUserController {
  constructor(private readonly productsuserService: ProductsUserService) {}

  @Get(":id/detail")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async getProductuserById(
    @Param("id") productId: string,
    @Req() req: any,
  ) {
    // Automatically get userId from token if authenticated, otherwise undefined
    const userId = req.user?.userId;
    return this.productsuserService.getProductuserById(productId, userId);
  }


  @Get('all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async getAllProductsForUser(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('category') category?: Categories,
    @Query('sortPrice') sortPrice?: 'asc' | 'desc',
    @Query('wishlist') wishlist?: 'true' | 'false',
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('purity') purity?: string,
  ) {
    // Automatically get userId from token if authenticated, otherwise undefined
    const userId = req.user?.userId;
    
    const result = await this.productsuserService.getAllProductsForUser(
      {
        search,
        category,
        sortPrice,
        wishlist,
        minPrice,
        maxPrice,
        purity,
      },
      userId,
    );

    return {
      data: result.products,
    };
  }

}
