import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<WishlistDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // Toggle Wishlist
  async toggleWishlist(
    productId: string,
    userId: string,
  ): Promise<boolean> {
    if (!productId || !userId) {
      throw new BadRequestException('productId and userId are required');
    }

    const session = await this.wishlistModel.startSession();
    let result = false;

    try {
      await session.withTransaction(async () => {
        // Try to delete existing wishlist entry
        const existingWishlist = await this.wishlistModel.findOneAndDelete(
          {
            productId: new Types.ObjectId(productId),
            userId: new Types.ObjectId(userId),
          },
          { session },
        );

        // If not found → create wishlist
        if (!existingWishlist) {
          await this.wishlistModel.create(
            [
              {
                productId: new Types.ObjectId(productId),
                userId: new Types.ObjectId(userId),
              },
            ],
            { session },
          );
          result = true; // added
        } else {
          result = false; // removed
        }
      });
    } finally {
      session.endSession();
    }

    return result;
  }


  // Get User Wishlist (with pagination + product)
  async getUserWishlist({
    page = 1,
    limit = 10,
    userId,
    category,
  }: {
    page: number;
    limit: number;
    userId: string;
    category?: string;
  }): Promise<{ wishlists: any[]; totalCount: number }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const pipeline: any[] = [
      //  Match logged-in user's wishlist
      {
        $match: {
          userId: new Types.ObjectId(userId),
        },
      },

      //  Lookup Product
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },

      //  Optional category filter
      ...(category
        ? [{ $match: { 'product.categories': category } }]
        : []),

      //  All wishlists on this product
      {
        $lookup: {
          from: 'wishlists',
          localField: 'product._id',
          foreignField: 'productId',
          as: 'allWishlists',
        },
      },

      // Users who wishlisted this product
      {
        $lookup: {
          from: 'users',
          localField: 'allWishlists.userId',
          foreignField: '_id',
          as: 'users',
        },
      },

      // Simplify users (FULL NAME FIXED)
      {
        $addFields: {
          users: {
            $map: {
              input: '$users',
              as: 'u',
              in: {
                _id: { $toString: '$$u._id' },
                fullName: { $ifNull: ['$$u.fullName', ''] },
                avatar: { $ifNull: ['$$u.avatar', null] },
              },
            },
          },
        },
      },

      //  Final response shape
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$product',
              {
                wishlistId: '$_id',
                productId: '$product._id',
                isWishlisted: true,
                users: '$users',
              },
            ],
          },
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    const skip = (page - 1) * limit;

    const [list, totalCount] = await Promise.all([
      this.wishlistModel.aggregate(pipeline).skip(skip).limit(limit),
      this.wishlistModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return {
      wishlists: list,
      totalCount,
    };
  }

}