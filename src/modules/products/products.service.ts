import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Product, ProductDocument } from "./schemas/product.schema";
import { AddProductDto } from "./dto/add.product.dto";
import { Categories } from "./interfaces/product.interface";
import { WishlistService } from "../wishlist/wishlist.service";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly wishlistService: WishlistService
  ) {}

  async addProduct(productData: AddProductDto): Promise<Product> {
    // Check SKU uniqueness
    try {
      const exists = await this.productModel.findOne({ sku: productData.sku });

      if (exists) {
        throw new ConflictException(
          `Product with SKU ${productData.sku} already exists`,
        );
      }

      const newProduct = new this.productModel(productData);

      this.logger.log(`Creating product SKU: ${productData.sku}`);
      newProduct.save();
      return newProduct;
    } catch (error) {
      this.logger.error(
        `Failed to add product SKU: ${productData.sku}`,
        error.stack,
      );
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to create product",
        error.message,
      );
    }
  }

  async getAllProducts(
    search?: string,
    category?: Categories,
    sortPrice?: "asc" | "desc",
    page = 1,
    limit = 10,
  ): Promise<{
    products: Product[];
    page: number;
    limit: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalCount: number;
    totalPages: number;
  }> {
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.categories = category;
    }

    const sort: any = {};
    if (sortPrice === "asc") sort.mrpPrice = 1;
    if (sortPrice === "desc") sort.mrpPrice = -1;

    const skip = (page - 1) * limit;

    try {
      const [products, totalCount] = await Promise.all([
        this.productModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select("-__v -createdAt -updatedAt")
          .lean()
          .exec(),

        this.productModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        products,
        page,
        limit,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        totalCount,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve products`, error.stack);
      throw new InternalServerErrorException("Failed to retrieve products");
    }
  }


  async getProductById(productId: string): Promise<Product> {
    try {
      const product = await this.productModel
        .findById(productId)
        .select("-__v -createdAt -updatedAt")
        .lean()
        .exec();
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      return product;
    } catch (error) {
      this.logger.error(`Failed to retrieve products`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to retrieve products");
    }
  }

  async updateProduct(
    productId: string,
    updateData: any,
    ): Promise<Product> {
    try {
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          productId,
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .select("-__v -createdAt -updatedAt")
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException(
          `Product with ID ${productId} not found`,
        );
      }

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to update product",
      );
    }
  }

  async getAllProductsForUser(
    params: {
      search?: string;
      category?: Categories;
      sortPrice?: 'asc' | 'desc';
      wishlist?: 'true' | 'false';
      page?: number;
      limit?: number;
    },
    userId?: string,
  ): Promise<{
    products: any[];
    page: number;
    limit: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalCount: number;
    totalPages: number;
  }> {
    const {
      search,
      category,
      sortPrice,
      wishlist,
      page = 1,
      limit = 10,
    } = params;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.categories = category;
    }

    const sort: any = {};
    if (sortPrice === 'asc') sort.mrpPrice = 1;
    if (sortPrice === 'desc') sort.mrpPrice = -1;

    const skip = (page - 1) * limit;

    // Fetch products and total count
    const [products, totalCount] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      this.productModel.countDocuments(filter),
    ]);

    if (!products.length) {
      return {
        products: [],
        page,
        limit,
        currentPage: page,
        hasNextPage: false,
        hasPreviousPage: page > 1,
        totalCount,
        totalPages: 0,
      };
    }

    const productIds = products.map(p => p._id.toString());

    // Get wishlist status for all products in parallel (similar to bookmark logic)
    const wishlistPromises = productIds.map(async (productId) => {
      try {
        const wishlistStatus = await this.wishlistService.isProductWishlisted(
          productId,
          userId,
        );
        return wishlistStatus;
      } catch (error) {
        return false; // Handle any errors by defaulting to false
      }
    });

    const wishlistCountPromises = productIds.map((productId) =>
      this.wishlistService.getWishlistCount(productId),
    );

    const [wishlistResults, wishlistCounts] = await Promise.all([
      Promise.all(wishlistPromises),
      Promise.all(wishlistCountPromises),
    ]);

    // Combine products with wishlist status (similar to assetsWithBookmarks)
    let productsWithWishlist = products.map((product, index) => ({
      ...product,
      isWishlisted: wishlistResults[index],
      wishlistCount: wishlistCounts[index],
    }));

    // Filter by wishlist if requested (similar to bookmarked filter)
    if (wishlist === 'true') {
      productsWithWishlist = productsWithWishlist.filter(
        (product) => product.isWishlisted === true,
      );
    }

    const totalPages = Math.ceil(totalCount / limit);

    return {
      products: productsWithWishlist,
      page,
      limit,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      totalCount,
      totalPages,
    };
  }



}
