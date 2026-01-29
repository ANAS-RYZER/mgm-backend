import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { AddProductDto } from "./dto/add.product.dto";
import { AdminJwtAuthGuard } from "../admins/guards/admin-jwt-auth.guard";
import { Categories } from "./interfaces/product.interface";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("/add-product")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminJwtAuthGuard)
  async addProduct(@Body() addProductDto: AddProductDto) {
    return this.productsService.addProduct(addProductDto);
  }
  @Get("/all")
  @HttpCode(HttpStatus.OK)
  async getAllProducts(
    @Query("search") search?: string,
    @Query("category") category?: Categories,
    @Query("sortPrice") sortPrice?: "asc" | "desc",
  ) {
    return this.productsService.getAllProducts(search, category, sortPrice);
  }

  @Get("/:id")
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param("id") productId: string) {
    return this.productsService.getProductById(productId);
  }
}
