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
import { ProductsService } from "./products.service";
import { AddProductDto } from "./dto/add.product.dto";
import { NormalizeStoneSpecsInterceptor } from "./interceptors/normalize-stone-specs.interceptor";
import { AdminJwtAuthGuard } from "../admins/guards/admin-jwt-auth.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { Categories } from "./interfaces/product.interface";
import { UpdateProductDto } from "./dto/update.product.dto";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("/add-product")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(NormalizeStoneSpecsInterceptor)
  // @UseGuards(AdminJwtAuthGuard)
  async addProduct(@Body() addProductDto: AddProductDto) {
    console.log("addProductDto", addProductDto);
    return this.productsService.addProduct(addProductDto);
  }
  @Get("/all")
  @HttpCode(HttpStatus.OK)
  async getAllProducts(
    @Query("search") search?: string,
    @Query("category") category?: Categories,
    @Query("sortPrice") sortPrice?: "asc" | "desc",
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    const result = await this.productsService.getAllProducts(
      search,
      category,
      sortPrice,
      Number(page),
      Number(limit),
    );

    return {
      data: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        currentPage: result.currentPage,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    };
  }

  @Get("/sku/:sku")
  @HttpCode(HttpStatus.OK)
  async getProductBySku(@Param("sku") sku: string) {
    return this.productsService.getProductBySku(sku);
  }



  @Get("/:id")
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param("id") productId: string) {
    console.log("hello product id");
    return this.productsService.getProductById(productId);
  }

  @Put("/update/:id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminJwtAuthGuard)
  async updateProduct(
    @Param("id") productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(productId, updateProductDto);
  }
}
