import { Module } from "@nestjs/common";
import { ProductsUserController } from "./productuser.controller";
import { ProductsUserService } from "./productuser.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "../schemas/product.schema";
import { WishlistModule } from "../../wishlist/wishlist.module";
import { AdminAuthModule } from "../../admins/admin-auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    AdminAuthModule,
    WishlistModule,
  ],

  controllers: [ProductsUserController],
  providers: [ProductsUserService],
})
export class ProductsUserModule {}

