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
  ROUND_BRILLIANT = "Round Brilliant",
  OVAL = "Oval",
  PRINCESS = "Princess",
  CUSHION = "Cushion",
  EMERALD = "Emerald Cut",
  PEAR = "Pear",
  MARQUISE = "Marquise",
  RADIANT = "Radiant",
  ASSCHER = "Asscher",
  HEART = "Heart",
  TRILLIANT = "Trilliant",
  BAGUETTE = "Baguette",
  CABOCHON = "Cabochon",
  ROSE = "Rose Cut",
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

export enum GemstoneColor {
  VIVID_GREEN = "Vivid Green",
  GREEN = "Green",
  LIGHT_GREEN = "Light Green",
  DEEP_GREEN = "Deep Green",

  VIVID_BLUE = "Vivid Blue",
  ROYAL_BLUE = "Royal Blue",

  RED = "Red",
  VIVID_RED = "Vivid Red",

  YELLOW = "Yellow",
  PINK = "Pink",
  PURPLE = "Purple",
  ORANGE = "Orange",
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
  NEW_LAUNCH = "New Launch",
  READY_TO_SHIP = "Ready to Ship",
  IN_PRODUCTION = "In Production",
  LOW_STOCK = "Low Stock",
  OUT_OF_STOCK = "Out of Stock",
  BEST_SELLER = "Best Seller",
  LIMITED_EDITION = "Limited Edition",
  DISCONTINUED = "Discontinued"
}

export interface IProduct {
  _id?: string;
  sku: string;
  name: string;
  description?: string;
  mrpPrice: number;
  discountedPrice?: number;
  gallery?: string[];
  stockQuantity: number;
  categories: Categories;
  goldSpecs: {
    kartage: string;
    goldWeight: number;
    grossWeight: number;
    purity: string;
    makingCharges: number;
    metal: string;
  };
  stoneSpecs?: StoneDetails[];
  status: ProductStatus;
  
}
