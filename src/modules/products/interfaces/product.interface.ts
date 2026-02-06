export enum Categories {
  RINGS = "rings",
  NECKLACES = "necklaces",
  EARRINGS = "earrings",
  BANGLES = "bangles",
  PENDANTS = "pendants",
  BRACELETS = "bracelets",
  MANGALSUTRAS = "mangalsutras",
  CHAINS = "chains",
}

export enum GemCut {
  ROUND = "round",
  ROUND_BRILLIANT = "round-brilliant",
  OVAL = "oval",
  PRINCESS = "princess",
  CUSHION = "cushion",
  EMERALD = "emerald-cut",
  PEAR = "pear",
  MARQUISE = "marquise",
  RADIANT = "radiant",
  ASSCHER = "asscher",
  HEART = "heart",
  TRILLIANT = "trilliant",
  BAGUETTE = "baguette",
  CABOCHON = "cabochon",
  ROSE = "rose-cut",
}

export enum DiamondClarity {
  FL = "FL", // Flawless
  IF = "IF", // Internally Flawless
  VVS1 = "VVS1", // Very Very Slightly Included
  VVS2 = "VVS2",
  VS1 = "VS1", // Very Slightly Included
  VS2 = "VS2",
  SI1 = "SI1", // Slightly Included
  SI2 = "SI2",
  I1 = "I1", // Included
  I2 = "I2",
  I3 = "I3",
}
export enum DiamondColor {
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  I = "I",
  J = "J",
  K = "K",
  L = "L",
  M = "M",
  N = "N",
  O = "O",
  P = "P",
  Q = "Q",
  R = "R",
  S = "S",
  T = "T",
  U = "U",
  V = "V",
  W = "W",
  X = "X",
  Y = "Y",
  Z = "Z",
}

export enum StoneType {
  DIAMOND = "diamond",
  GEMSTONE = "gemstone",
}
export enum GemstoneColor {
  VIVID_GREEN = "vivid-green",
  GREEN = "green",
  LIGHT_GREEN = "light-green",
  DEEP_GREEN = "deep-green",

  VIVID_BLUE = "vivid-blue",
  ROYAL_BLUE = "royal-blue",

  RED = "red",
  VIVID_RED = "vivid-red",

  YELLOW = "yellow",
  PINK = "pink",
  PURPLE = "purple",
  ORANGE = "orange",
}

export type Color =
  | { type: "DIAMOND"; value: DiamondColor }
  | { type: "GEMSTONE"; value: GemstoneColor };

export interface StoneDetails {
  stoneName: string;
  quantity: number;
  cut: GemCut;
  clarity: DiamondClarity;
  color: Color;
}
export enum ProductStatus {
  NEW_LAUNCH = "new-launch",
  READY_TO_SHIP = "ready-to-ship",
  IN_PRODUCTION = "in-production",
  LOW_STOCK = "low-stock",
  OUT_OF_STOCK = "out-of-stock",
  BEST_SELLER = "best-seller",
  LIMITED_EDITION = "limited-edition",
  DISCONTINUED = "discontinued",
}

export interface IProduct {
  _id?: string;
  sku: string;
  name: string;
  description?: string;
  mrpPrice: number;
  discountedPrice?: number;
  image?: string;
  gallery?: string[];
  stockQuantity: number;
  categories: Categories;
  goldSpecs: {
    karat: string;
    goldWeight: number;
    grossWeight: number;
    purity: string;
    makingCharges: number;
    metal: string;
  };
  stoneSpecs?: StoneDetails[];
  status: ProductStatus;
}
