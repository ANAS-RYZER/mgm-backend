import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "./schemas/product.schema";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminAuthModule } from "../admins/admin-auth.module";
import { WishlistModule } from "../wishlist/wishlist.module";
import { ProductsUserModule } from "./productuser/productuser.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    AdminAuthModule,
    WishlistModule,
    ProductsUserModule,
  ],

  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [MongooseModule], 
})
export class ProductsModule {}
