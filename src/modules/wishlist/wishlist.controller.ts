import {
  Controller,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // Toggle wishlist
  @Put('toggle')
  async toggleWishlist(
    @Query('productId') productId: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;

    const isWishlisted = await this.wishlistService.toggleWishlist(
      productId,
      userId,
    );

    return {
      isWishlisted,
      message: isWishlisted
        ? 'Added to wishlist'
        : 'Removed from wishlist',
    }
  }

  // Get user wishlist
  @Get()
  async getWishlist(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('category') category?: string,
  ) {
    const userId = req.user.userId;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const result = await this.wishlistService.getUserWishlist({
      page: pageNum,
      limit: limitNum,
      userId,
      category,
    });

    return {
      data: result.wishlists,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limitNum),
        hasNextPage: pageNum * limitNum < result.totalCount,
        hasPreviousPage: pageNum > 1,
      },
      message: 'Wishlist fetched successfully',
    };
  } 
}