import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import {
  Categories,
  DiamondClarity,
  DiamondColor,
  GemCut,
  GemstoneColor,
  IProduct,
  ProductStatus,
} from "../interfaces/product.interface";

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

  @Prop({required: false})
  stoneprice?: number

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
  makingCharges: number;

  @Prop({ required: true })
  metal: string;
}
export const GoldSpecsSchema = SchemaFactory.createForClass(GoldSpecs);

export type ProductDocument = Product & Document;

//Product Schema
@Schema({ timestamps: true })
export class Product  {
  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  mrpPrice: number;

  @Prop({ type: Number, default: 0 })
  discountedPercentage?: number;

  @Prop({type:Number, default:0})
  discountedPrice?:number;

  @Prop({type: Number, default:0})
  goldPrice?:number;

  @Prop({type: Number, default:0})
  multiplestonePrice?:number;

  @Prop({type:Number, default:0})
  grossPrice?:number;

  @Prop({ type: Number, default: 0})
  netprice?: number;

  @Prop({ type: Number, default: 0})
  cgst?: number;

  @Prop({type: Number, default:0})
  sgst?:number;

  @Prop({ type: Number, default: 0 })
  va?: number;  
  
  @Prop({ type: Number, default: 0 })
  makingChanges?: number;

  @Prop()
  image: string;

  @Prop({ type: [String] })
  gallery?: string[];

  @Prop({ required: true })
  stockQuantity: number;

  @Prop({ enum: Categories, required: true })
  categories: Categories;

  @Prop({ type: GoldSpecsSchema, required: true })
  goldSpecs?: GoldSpecs;

  @Prop({ type: [StoneDetailsSchema] })
  stoneSpecs?: StoneDetails[];

  
}

export const ProductSchema = SchemaFactory.createForClass(Product);
