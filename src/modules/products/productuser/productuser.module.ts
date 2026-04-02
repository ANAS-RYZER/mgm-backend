import { Module } from "@nestjs/common";
import { ProductsUserController } from "./productuser.controller";
import { ProductsUserService } from "./productuser.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "../schemas/product.schema";
import { WishlistModule } from "../../wishlist/wishlist.module";
import { AdminAuthModule } from "../../admins/admin-auth.module";
import { Wishlist, WishlistSchema } from "../../wishlist/schemas/wishlist.schema";
import { Order,OrderSchema } from "../../order/schema/order.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    MongooseModule.forFeature([{name: Wishlist.name, schema: WishlistSchema}]),
    MongooseModule.forFeature([{name: Order.name, schema: OrderSchema}]),
    AdminAuthModule,
    WishlistModule,
  ],

  controllers: [ProductsUserController],
  providers: [ProductsUserService],
})
export class ProductsUserModule {}

