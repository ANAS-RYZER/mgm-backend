import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "./schemas/product.schema";
import { AddProductDto } from "./dto/add.product.dto";
import { Categories } from "./interfaces/product.interface";
import { WishlistService } from "../wishlist/wishlist.service";

// Category code mapping for SKU: GD = Gold, {CODE} = category (ER=earring, BG=bangle, etc.)
const CATEGORY_SKU_CODES: Record<Categories, string> = {
  [Categories.EARRINGS]: "ER",
  [Categories.BANGLES]: "BG",
  [Categories.NECKLACES]: "NC",
  [Categories.RINGS]: "RG",
  [Categories.PENDANTS]: "PD",
  [Categories.BRACELETS]: "BR",
  [Categories.MANGALSUTRAS]: "MS",
  [Categories.CHAINS]: "CH",
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly wishlistService: WishlistService,
  ) {}

  private generateSku(category: Categories): string {
    const code = CATEGORY_SKU_CODES[category] ?? "XX";
    const randomLetters = Array.from({ length: 2 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    ).join("");
    const randomDigits = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 10),
    ).join("");
    return `GD-${code}${randomLetters}-${randomDigits}`;
  }

  async addProduct(productData: AddProductDto): Promise<Product> {
    try {
      let sku = "";
      console.log("sku", sku);
      if (!sku) {
        const maxRetries = 10;
        let foundUnique = false;
        for (let i = 0; i < maxRetries; i++) {
          sku = this.generateSku(productData.categories);
          const exists = await this.productModel.findOne({ sku });
          if (!exists) {
            foundUnique = true;
            break;
          }
        }
        if (!foundUnique) {
          throw new InternalServerErrorException(
            "Failed to generate unique SKU after retries",
          );
        }
        console.log("sku", sku);
      } else {
        const exists = await this.productModel.findOne({ sku });
        if (exists) {
          throw new ConflictException(`Product with SKU ${sku} already exists`);
        }
      }

      const payload = { ...productData, sku };
      const newProduct = new this.productModel(payload);

      return await newProduct.save();
    } catch (error) {
      this.logger.error(
        `Failed to add product SKU: ${productData.name ?? "auto-generated"}`,
        error.stack,
      );
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
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
    userId?: string,
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

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [{ name: regex }, { sku: regex }, { categories: regex }];
    }

    if (category) {
      filter.categories = category;
    }

    const skip = (page - 1) * limit;

    try {
      const pipeline: any[] = [
        { $match: filter },

        ...(userId && Types.ObjectId.isValid(userId)
          ? [
              {
                $lookup: {
                  from: "wishlists",
                  let: { productId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$productId", "$$productId"] },
                            {
                              $eq: ["$userId", new Types.ObjectId(userId)],
                            },
                          ],
                        },
                      },
                    },
                  ],
                  as: "wishlistData",
                },
              },
              {
                $addFields: {
                  isWishlisted: {
                    $gt: [{ $size: "$wishlistData" }, 0],
                  },
                },
              },
              {
                $project: {
                  wishlistData: 0,
                },
              },
            ]
          : [
              {
                $addFields: {
                  isWishlisted: false,
                },
              },
            ]),

        // 🔥 Sorting
        ...(sortPrice
          ? [
              {
                $sort: {
                  mrpPrice: sortPrice === "asc" ? 1 : -1,
                },
              },
            ]
          : []),

        // 🔥 Pagination
        { $skip: skip },
        { $limit: limit },

        // 🔥 Remove unwanted fields
        {
          $project: {
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ];

      const [products, totalCount] = await Promise.all([
        this.productModel.aggregate(pipeline),
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
        // Ensure schema defaults are applied when returning lean objects
        .lean({ defaults: true })
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

  async updateProduct(productId: string, updateData: any): Promise<Product> {
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
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to update product");
    }
  }

  async getProductBySku(sku: string): Promise<Product> {
    try {
      const product = await this.productModel
        .findOne({ sku })
        .select("-__v -createdAt -updatedAt")
        // Ensure schema defaults are applied when returning lean objects
        .lean({ defaults: true })
        .exec();

      if (!product) {
        throw new NotFoundException(`Product with SKU ${sku} not found`);
      }

      return product;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve product by SKU: ${sku}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to retrieve product");
    }
  }
}
