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
import { Product, ProductDocument } from "../schemas/product.schema";
import { Categories } from "../interfaces/product.interface";
import { WishlistService } from "../../wishlist/wishlist.service";
import { Wishlist, WishlistDocument } from "../../wishlist/schemas/wishlist.schema";
import { Order, OrderDocument } from "../../order/schema/order.schema";

@Injectable()
export class ProductsUserService {
  private readonly logger = new Logger(ProductsUserService.name);
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<WishlistDocument>,
    
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    private readonly wishlistService: WishlistService
  ) {}

  async getProductuserById(productId: string, userId?: string): Promise<any> {
    try {
      const product = await this.productModel
        .findById(productId)
        .select("-__v -createdAt -updatedAt")
        .lean()
        .exec();
      
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get wishlist information (similar to bookmark logic)
      const [isWishlisted, wishlistUsers] = await Promise.all([
        this.wishlistService.isProductWishlisted(productId, userId),
        this.wishlistService.getUsersWhoWishlisted(productId),
      ]);

      // Return product with wishlist data
      return {
        ...product,
        isWishlisted,
        wishlistUsers, // Users who wishlisted this product
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to retrieve product");
    }
  }


  async getAllProductsForUser(
    params: {
      search?: string;
      category?: Categories;
      sortPrice?: 'asc' | 'desc';
      wishlist?: 'true' | 'false';
      minPrice?: number;
      maxPrice?: number;
      purity?: string;
      loadMore?: boolean;
    },
    userId?: string,
  ): Promise<{
    products: any[];

    
    totalCount: number;

  }> {
    const {
      search,
      category,
      sortPrice,
      wishlist,
      minPrice,
      maxPrice,
      purity,
      loadMore = false,
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

    if (minPrice !== undefined && maxPrice !== undefined) {
      filter.mrpPrice = {
        $gte: Number(minPrice),
        $lte: Number(maxPrice),
      };
    }

    if (purity) {
      filter['goldSpecs.karat'] = purity;
    }

    const sort: any = {};
    if (sortPrice === 'asc') sort.mrpPrice = 1;
    if (sortPrice === 'desc') sort.mrpPrice = -1;

 

    // Fetch products and total count
    const [products, totalCount] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
       
        .lean(),

      this.productModel.countDocuments(filter),
    ]);

    if (!products.length) {
      return {
        products: [],

        totalCount,

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


    return {
      products: productsWithWishlist,
      totalCount,
  
    };
  }

  async getTopWishlistedProducts(limit: number = 5) {
    return this.wishlistModel.aggregate([
      {
        $group: {
          _id: "$productId",
          wishlistCount: { $sum: 1 },
        },
      },
      {
        $sort: { wishlistCount: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "products",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                name: 1,
                image: 1,
                categories: 1,
              },
            },
          ],
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          wishlistCount: 1,
          product: 1,
        },
      },
    ]);
  }

  async getTopOrderedProducts(limit: number = 5) {
  return this.orderModel.aggregate([
    // Step 1: Unwind SKU array
    {
      $unwind: "$productSku",
    },

    // ✅ Step 2: Group by SKU (string)
    {
      $group: {
        _id: "$productSku",
        orderCount: { $sum: 1 },
      },
    },

    // ✅ Step 3: Sort highest orders first
    {
      $sort: { orderCount: -1 },
    },

    // ✅ Step 4: Limit top 5
    {
      $limit: limit,
    },

    // ✅ Step 5: Lookup product using SKU
    {
      $lookup: {
        from: "products",
        localField: "_id",   // SKU from orders
        foreignField: "sku", // SKU in product
        as: "product",
      },
    },

    // ✅ Step 6: Remove empty matches
    {
      $unwind: {
        path: "$product",
        preserveNullAndEmptyArrays: false,
      },
    },

    // ✅ Step 7: Final output
    {
      $project: {
        _id: 0,
        sku: "$_id",
        orderCount: 1,
        name: "$product.name",
        image: "$product.image",
        categories: "$product.categories",
      },
    },
  ]);
}



}
