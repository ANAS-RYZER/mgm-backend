import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Categories, DiamondClarity, DiamondColor, GemCut, GemstoneColor, ProductStatus } from "../interfaces/product.interface";

//Color Schema
@Schema({ _id: false })
export class ColorSchema {
  @Prop({ enum: ["DIAMOND", "GEMSTONE"], required: true })
  type: "DIAMOND" | "GEMSTONE";

  @Prop({ required: true })
  value: DiamondColor | GemstoneColor;
}
export const ColorSchemaFactory = SchemaFactory.createForClass(ColorSchema);

//Stone Details Schema
@Schema({ _id: false })
export class StoneDetails {
  @Prop({ required: true })
  stoneName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ enum: GemCut, required: true })
  cut: GemCut;

  @Prop({ enum: DiamondClarity })
  clarity?: DiamondClarity;

  @Prop({ type: ColorSchemaFactory, required: true })
  color: ColorSchema;
}
export const StoneDetailsSchema = SchemaFactory.createForClass(StoneDetails);


//Gold Specs Schema
@Schema({ _id: false })
export class GoldSpecs {
  @Prop({ required: true })
  karat: string;

  @Prop({ required: true })
  goldWeight: number;

  @Prop({ required: true })
  grossWeight: number;

  @Prop({ required: true })
  purity: string;

  @Prop({ required: true })
  makingCharges: number;

  @Prop({ required: true })
  metal: string;
}
export const GoldSpecsSchema = SchemaFactory.createForClass(GoldSpecs);

//Product Schema
@Schema({ timestamps: true })
export class Product extends Document {

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  mrpPrice: number;

  @Prop()
  discountedPrice?: number;

  @Prop({ type: [String] })
  gallery?: string[];

  @Prop({ required: true })
  stockQuantity: number;

  @Prop({ enum: Categories, required: true })
  categories: Categories;

  @Prop({ type: GoldSpecsSchema, required: true })
  goldSpecs: GoldSpecs;

  @Prop({ type: [StoneDetailsSchema] })
  stoneSpecs?: StoneDetails[];

  @Prop({ enum: ProductStatus, required: true })
  status: ProductStatus;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
