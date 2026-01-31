import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
})
export class Wishlist {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

//  Prevent duplicate wishlist entries
WishlistSchema.index(
  { userId: 1, productId: 1 },
  { unique: true },
);
