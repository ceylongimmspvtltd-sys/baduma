/**
 * Shared product catalog — main dishes, combo packages, and add-on items.
 *
 * Every item carries its image, price, and presentation data. Used by the
 * menu grid, the dynamic product detail page, and the combo/recipe/add-on flows.
 */

export interface Product {
  id: string;
  name: string;
  category: 'Fried Rice' | 'Kottu' | 'Pasta' | 'Special';
  veg: boolean; // drives the dynamic VEG / NON-VEG badge color
  priceNormal?: number;
  priceFull?: number;
  image: string;
  prepTime: number; // minutes
  ingredients: string[];
  description: string;
}

export interface ComboDeal {
  id: string;
  name: string;
  includes: string[];
  price: number;
  save: number;
  image: string;
}

export interface SuggestedAddOn {
  id: string;
  name: string;
  price: number;
  grams: number;
  volume?: number;
  image: string;
}

export interface CustomAddOn {
  id: string;
  name: string;
  price: number;
  grams: number;
  volume?: number;
}

export const BADUMA_MENU: Product[] = [
  // ───────────────────────── Fried Rice ─────────────────────────
  {
    id: 'fr-1',
    name: 'Vegetables Fried Rice',
    category: 'Fried Rice',
    veg: true,
    priceNormal: 500,
    priceFull: 750,
    image: '/images/fried-rice-veg.jpg',
    prepTime: 15,
    description: 'A colorful wok-tossed fried rice loaded with fresh garden vegetables.',
    ingredients: ['Steamed Rice', 'Carrots', 'Peas', 'Cabbage', 'Bell Pepper', 'Spring Onions', 'Garlic', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-2',
    name: 'Egg Fried Rice',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 600,
    priceFull: 850,
    image: '/images/fried-rice-egg.jpg',
    prepTime: 15,
    description: 'Classic egg fried rice with scrambled eggs and aromatic garlic.',
    ingredients: ['Steamed Rice', 'Eggs', 'Spring Onions', 'Garlic', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-3',
    name: 'Fish Fried Rice',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 700,
    priceFull: 1000,
    image: '/images/fried-rice-fish.jpg',
    prepTime: 20,
    description: 'Flaked fish fried rice with a light garlicky aroma.',
    ingredients: ['Steamed Rice', 'Fish', 'Garlic', 'Spring Onions', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-4',
    name: 'Chicken Fried Rice',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 700,
    priceFull: 1000,
    image: '/images/fried-rice-chicken.jpg',
    prepTime: 20,
    description: 'Tender chicken pieces tossed into fragrant fried rice.',
    ingredients: ['Steamed Rice', 'Chicken', 'Garlic', 'Spring Onions', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-5',
    name: 'Seafood Fried Rice',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 1200,
    priceFull: 1400,
    image: '/images/fried-rice-seafood.jpg',
    prepTime: 25,
    description: 'A decadent seafood fried rice with prawns and fish.',
    ingredients: ['Steamed Rice', 'Prawns', 'Fish', 'Garlic', 'Spring Onions', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-6',
    name: 'Mixed Fried Rice',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 1200,
    priceFull: 1400,
    image: '/images/monday-bowl.jpg',
    prepTime: 25,
    description: 'Everything-in-the-wok fried rice with chicken, fish, and vegetables.',
    ingredients: ['Steamed Rice', 'Chicken', 'Fish', 'Vegetables', 'Garlic', 'Spring Onions', 'Soy Sauce', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-7',
    name: 'Set Menu',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 1000,
    priceFull: 1300,
    image: '/images/set-menu.jpg',
    prepTime: 25,
    description: 'A complete set meal with fried rice and curd sambal.',
    ingredients: ['Steamed Rice', 'Chicken', 'Fish', 'Vegetables', 'Curd Sambal', 'Salt', 'Pepper'],
  },
  {
    id: 'fr-8',
    name: 'Nasigurang',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 1100,
    priceFull: 1400,
    image: '/images/nasigurang.jpg',
    prepTime: 25,
    description: 'Sri Lankan nasi gureng with rich rempah and coconut milk.',
    ingredients: ['Rice', 'Chicken', 'Eggs', 'Vegetables', 'Rempah', 'Coconut Milk', 'Salt'],
  },
  {
    id: 'fr-9',
    name: 'Biriyani',
    category: 'Fried Rice',
    veg: false,
    priceNormal: 1200,
    priceFull: 1500,
    image: '/images/biriyani.jpg',
    prepTime: 30,
    description: 'Aromatic biriyani layered with chicken, spices, and saffron rice.',
    ingredients: ['Rice', 'Chicken', 'Biryani Masala', 'Yoghurt', 'Onions', 'Cashew', 'Raisins', 'Mint', 'Salt'],
  },

  // ───────────────────────── Kottu ─────────────────────────
  {
    id: 'kt-1',
    name: 'Chicken Kottu (Normal)',
    category: 'Kottu',
    veg: false,
    priceNormal: 700,
    priceFull: 950,
    image: '/images/kottu-chicken.jpg',
    prepTime: 20,
    description: 'The iconic kottu rotti shredded and fried with chicken.',
    ingredients: ['Kottu Rotti', 'Chicken', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-2',
    name: 'Chicken Kottu (Special/Extra)',
    category: 'Kottu',
    veg: false,
    priceNormal: 700,
    priceFull: 950,
    image: '/images/tuesday-bowl.jpg',
    prepTime: 20,
    description: 'Special chicken kottu with an extra egg and richer gravy.',
    ingredients: ['Kottu Rotti', 'Chicken', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Egg', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-3',
    name: 'Seafood Kottu',
    category: 'Kottu',
    veg: false,
    priceNormal: 1000,
    priceFull: 1300,
    image: '/images/kottu-seafood.jpg',
    prepTime: 25,
    description: 'Kottu with prawns and fish in a spicy gravy.',
    ingredients: ['Kottu Rotti', 'Prawns', 'Fish', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-4',
    name: 'Mixed Kottu',
    category: 'Kottu',
    veg: false,
    priceNormal: 1300,
    priceFull: 1700,
    image: '/images/wednesday-bowl.jpg',
    prepTime: 25,
    description: 'A hearty mixed kottu with chicken, beef, and vegetables.',
    ingredients: ['Kottu Rotti', 'Chicken', 'Beef', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-5',
    name: 'Beef Kottu',
    category: 'Kottu',
    veg: false,
    priceNormal: 1000,
    priceFull: 1250,
    image: '/images/thursday-bowl.jpg',
    prepTime: 25,
    description: 'Succulent beef kottu with a deeply savoury gravy.',
    ingredients: ['Kottu Rotti', 'Beef', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-6',
    name: 'Cheese Kottu',
    category: 'Kottu',
    veg: true,
    priceNormal: 1100,
    priceFull: 1500,
    image: '/images/friday-bowl.jpg',
    prepTime: 20,
    description: 'Kottu rotti tossed in melted cheese and vegetables.',
    ingredients: ['Kottu Rotti', 'Cheese', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },
  {
    id: 'kt-7',
    name: 'Lava Kottu',
    category: 'Kottu',
    veg: false,
    priceFull: 2000,
    image: '/images/kottu-lava.jpg',
    prepTime: 25,
    description: 'The ultimate lava kottu — molten cheese with chicken and veg.',
    ingredients: ['Kottu Rotti', 'Cheese', 'Chicken', 'Cabbage', 'Carrots', 'Onions', 'Green Chilli', 'Salt', 'Pepper'],
  },

  // ───────────────────────── Pasta ─────────────────────────
  {
    id: 'ps-1',
    name: 'Baduma Special Pasta',
    category: 'Pasta',
    veg: false,
    priceNormal: 1000,
    image: '/images/pasta-special.jpg',
    prepTime: 20,
    description: 'Our signature pasta with chicken in a creamy garlic parmesan sauce.',
    ingredients: ['Pasta', 'Chicken', 'Cream', 'Garlic', 'Parmesan', 'Tomato', 'Basil', 'Salt', 'Pepper'],
  },
  {
    id: 'ps-2',
    name: 'Chilly Pasta',
    category: 'Pasta',
    veg: true,
    priceNormal: 1000,
    image: '/images/pasta-chilly.jpg',
    prepTime: 20,
    description: 'A spicy chilli pasta with crisp green peppers and garlic.',
    ingredients: ['Pasta', 'Green Peppers', 'Garlic', 'Chilli Flakes', 'Soy Sauce', 'Salt'],
  },
];

/** ───────────────────────── Combo Packages ───────────────────────── */
export const COMBOS: ComboDeal[] = [
  {
    id: 'combo-double-rice',
    name: '2 Fried Rice + 1 Large Coke',
    includes: ['2× Fried Rice (FULL portion)', '1× Large Coke (500ml)'],
    price: 1500,
    save: 300,
    image: '/images/combo-double-rice.jpg',
  },
  {
    id: 'combo-kottu-party',
    name: '2 Kottu + 1 Large Coke',
    includes: ['2× Kottu (FULL portion)', '1× Large Coke (500ml)'],
    price: 1600,
    save: 350,
    image: '/images/combo-kottu-party.jpg',
  },
  {
    id: 'combo-family-feast',
    name: 'Family Feast Combo',
    includes: ['2× Fried Rice (FULL)', '1× Kottu (FULL)', '2× Coke (500ml)'],
    price: 2600,
    save: 700,
    image: '/images/combo-family-feast.jpg',
  },
  {
    id: 'combo-party-pack',
    name: 'Party Pack Combo',
    includes: ['3× Fried Rice (FULL)', '1× French Fries', '2× Coke (500ml)'],
    price: 2900,
    save: 800,
    image: '/images/combo-party-pack.jpg',
  },
];

/** ───────────────────────── Custom Add-ons & Beverages ───────────────────────── */
export const CUSTOM_ADDONS: CustomAddOn[] = [
  { id: 'egg', name: 'Extra Egg', price: 100, grams: 50 },
  { id: 'cheese', name: 'Extra Cheese', price: 150, grams: 60 },
  { id: 'meat', name: 'Extra Meat', price: 200, grams: 100 },
  { id: 'coke', name: 'Coke', price: 80, grams: 0, volume: 330 },
  { id: 'sprite', name: 'Sprite', price: 80, grams: 0, volume: 330 },
  { id: 'juice', name: 'Fresh Fruit Juice', price: 120, grams: 0, volume: 400 },
];

/** ───────────────────────── Suggested Add-ons (image cross-sell) ───────────────────────── */
export const SUGGESTED_ADDONS: SuggestedAddOn[] = [
  {
    id: 'coke-bottle',
    name: 'Coke Bottle',
    price: 80,
    grams: 0,
    volume: 330,
    image: '/images/addon-coke.jpg',
  },
  {
    id: 'fries',
    name: 'French Fries',
    price: 150,
    grams: 150,
    image: '/images/addon-fries.jpg',
  },
  {
    id: 'dessert',
    name: 'Chocolate Brownie',
    price: 200,
    grams: 120,
    image: '/images/addon-dessert.jpg',
  },
  {
    id: 'devilled',
    name: 'Chicken Devilled',
    price: 250,
    grams: 200,
    image: '/images/addon-devilled.jpg',
  },
];

export function getProductById(id: string): Product | undefined {
  return BADUMA_MENU.find((p) => p.id === id);
}

export function getAllProductIds(): string[] {
  return BADUMA_MENU.map((p) => p.id);
}
