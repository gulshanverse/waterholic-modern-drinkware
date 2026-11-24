import tumblerStudioImg from '../assets/images/waterholic_tumbler_logo_1795462018716.jpg';
import filterStudioImg from '../assets/images/waterholic_filter_logo_1795462017913.jpg';
import carafeStudioImg from '../assets/images/waterholic_carafe_logo_1795462018645.jpg';
import packStudioImg from '../assets/images/waterholic_pack_logo_1795462050158.jpg';
import mineralStudioImg from '../assets/images/waterholic_mineral_logo_1795462051477.jpg';
import iceStudioImg from '../assets/images/wh_ice_bucket_molds_1795462647537.jpg';
import accessoriesStudioImg from '../assets/images/wh_care_accessories_kit_1795462647731.jpg';
import pinkPremiumBottleImg from '../assets/images/waterholic_pink_logo_bottle_1795462018577.jpg';
import bottleStudioLogoImg from '../assets/images/waterholic_studio_logo_bottle_1795462018573.jpg';
import bottleOutdoorLogoImg from '../assets/images/waterholic_outdoor_logo_bottle_1795462017951.jpg';
import bottleRiverLogoImg from '../assets/images/waterholic_river_logo_bottle_1795462051322.jpg';
import bottleColdLogoImg from '../assets/images/waterholic_thermal_cold_logo_1795462070545.jpg';
import bottleHotLogoImg from '../assets/images/waterholic_thermal_hot_logo_1795462070671.jpg';
import bottleCampusStudyLogoImg from '../assets/images/waterholic_campus_study_logo_1795462052216.jpg';
import bottleCampusGymLogoImg from '../assets/images/waterholic_campus_gym_logo_1795462051525.jpg';
import bottleCampusDormLogoImg from '../assets/images/waterholic_campus_dorm_logo_1795462072955.jpg';
import titaniumCanteenImg from '../assets/images/wh_titanium_canteen_1795462581030.jpg';
import expeditionJugImg from '../assets/images/wh_expedition_jug_1795462585735.jpg';
import infuserGlassImg from '../assets/images/wh_infuser_glass_bottle_1795462585066.jpg';
import smartLedBottleImg from '../assets/images/wh_smart_led_bottle_1795462584403.jpg';
import copperBottleImg from '../assets/images/wh_copper_bottle_1795462585304.jpg';
import siliconeSleeveBottleImg from '../assets/images/wh_silicone_sleeve_bottle_1795462584279.jpg';
import campMugImg from '../assets/images/wh_camp_mug_1795462621441.jpg';
import steelPintImg from '../assets/images/wh_steel_pint_1795462621256.jpg';
import slimTumblerImg from '../assets/images/wh_slim_tumbler_1795462622608.jpg';
import countertopDispenserImg from '../assets/images/wh_countertop_dispenser_1795462620403.jpg';
import ceramicJugImg from '../assets/images/wh_ceramic_jug_1795462621252.jpg';
import trailFilterImg from '../assets/images/wh_trail_filter_squeeze_1795462648017.jpg';
import electrolyteCansImg from '../assets/images/wh_electrolyte_cans_1795462648444.jpg';
import hydrationBladderImg from '../assets/images/wh_hydration_bladder_1795462648259.jpg';

export type CategoryId =
  | 'bottles'
  | 'tumblers'
  | 'filters'
  | 'carafes'
  | 'packs'
  | 'mineral'
  | 'ice'
  | 'accessories';

export interface ProductFinish {
  id: string;
  name: string;
  hex: string;
  filter?: string;
  isTransparent?: boolean;
}

export interface ProductSize {
  label: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: CategoryId;
  variety: string;
  material: string;
  price: number;
  capacity: string;
  highlightSpec: string;
  weight: string;
  rating: number;
  reviews: number;
  description: string;
  finishes: ProductFinish[];
  sizes: ProductSize[];
  image: string;
  imageFocus?: string;
  featured?: boolean;
  tag?: string;
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  shortName: string;
  tagline: string;
  image: string;
}

const FLASK_STUDIO = bottleStudioLogoImg;
const FLASK_RIVER = bottleRiverLogoImg;
const FLASK_TRAIL = bottleOutdoorLogoImg;
const FLASK_LAKE = bottleCampusStudyLogoImg;
const FLASK_COLD = bottleColdLogoImg;
const FLASK_HOT = bottleHotLogoImg;
const FLASK_LID = bottleStudioLogoImg;
const FLASK_SUNNY = bottleRiverLogoImg;

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'bottles',
    name: 'Insulated Bottles & Flasks',
    shortName: 'Bottles & Flasks',
    tagline: 'Double-wall vacuum steel, titanium, and ceramic-lined vessels.',
    image: FLASK_STUDIO,
  },
  {
    id: 'tumblers',
    name: 'Tumblers & Hydration Mugs',
    shortName: 'Tumblers & Mugs',
    tagline: 'Cup-holder ready tumblers, straw cups, and camp mugs.',
    image: tumblerStudioImg,
  },
  {
    id: 'filters',
    name: 'Water Filters & Purifiers',
    shortName: 'Filters & Purifiers',
    tagline: 'UV-C purifiers, carbon pitchers, RO systems, and trail microfilters.',
    image: filterStudioImg,
  },
  {
    id: 'carafes',
    name: 'Pitchers, Carafes & Dispensers',
    shortName: 'Pitchers & Carafes',
    tagline: 'Borosilicate bedside sets, stoneware jugs, and table dispensers.',
    image: carafeStudioImg,
  },
  {
    id: 'packs',
    name: 'Hydration Packs & Soft Flasks',
    shortName: 'Hydration Packs',
    tagline: 'Trail running vests, collapsible soft flasks, and insulated bladders.',
    image: packStudioImg,
  },
  {
    id: 'mineral',
    name: 'Mineral & Sparkling Water',
    shortName: 'Mineral & Sparkling',
    tagline: 'Alpine spring water, botanical infusions, electrolytes, and carbonators.',
    image: mineralStudioImg,
  },
  {
    id: 'ice',
    name: 'Ice, Chillers & Barware',
    shortName: 'Ice & Chillers',
    tagline: 'Crystal-clear sphere molds, countertop ice makers, and chilled glassware.',
    image: iceStudioImg,
  },
  {
    id: 'accessories',
    name: 'Lids, Straws & Care Gear',
    shortName: 'Lids & Care Gear',
    tagline: 'Leakproof caps, reusable steel straws, silicone boots, and cleaning kits.',
    image: accessoriesStudioImg,
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryId, CategoryMeta>
);

const FINISH_SETS: Record<
  'alpine' | 'mineral' | 'trail' | 'pure' | 'botanical' | 'rose',
  ProductFinish[]
> = {
  alpine: [
    { id: 'blue', name: 'Ocean Blue', hex: '#0284C7' },
    {
      id: 'pink',
      name: 'Rose Pink',
      hex: '#E495A6',
      filter: 'hue-rotate(138deg) saturate(0.95) brightness(1.08)',
    },
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      filter: 'saturate(0.18) brightness(1.18) contrast(0.92) opacity(0.86)',
      isTransparent: true,
    },
    {
      id: 'sage',
      name: 'Alpine Sage',
      hex: '#48634B',
      filter: 'hue-rotate(-72deg) saturate(0.76) brightness(0.96)',
    },
    {
      id: 'basalt',
      name: 'Basalt Black',
      hex: '#222624',
      filter: 'saturate(0.18) brightness(0.76) contrast(1.12)',
    },
    {
      id: 'glacier',
      name: 'Glacier Silver',
      hex: '#B4BDB8',
      filter: 'saturate(0.12) brightness(1.14) contrast(0.95)',
    },
  ],
  mineral: [
    { id: 'stone', name: 'Limestone', hex: '#C7C2B8' },
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      filter: 'saturate(0.16) brightness(1.16) contrast(0.92) opacity(0.86)',
      isTransparent: true,
    },
    {
      id: 'blue',
      name: 'Ocean Blue',
      hex: '#0284C7',
      filter: 'saturate(1.22) brightness(0.99)',
    },
    {
      id: 'pink',
      name: 'Rose Pink',
      hex: '#E495A6',
      filter: 'hue-rotate(138deg) saturate(0.92) brightness(1.06)',
    },
    {
      id: 'slate',
      name: 'River Slate',
      hex: '#59686B',
      filter: 'saturate(0.42) brightness(0.9)',
    },
    {
      id: 'basalt',
      name: 'Basalt Black',
      hex: '#222624',
      filter: 'saturate(0.2) brightness(0.76) contrast(1.12)',
    },
  ],
  trail: [
    { id: 'blue', name: 'Glacier Blue', hex: '#0284C7' },
    {
      id: 'pink',
      name: 'Blush Pink',
      hex: '#E495A6',
      filter: 'hue-rotate(138deg) saturate(0.94) brightness(1.07)',
    },
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      filter: 'saturate(0.18) brightness(1.18) contrast(0.92) opacity(0.86)',
      isTransparent: true,
    },
    {
      id: 'moss',
      name: 'Pine Moss',
      hex: '#4A614D',
      filter: 'hue-rotate(-72deg) saturate(0.76) brightness(0.95)',
    },
    {
      id: 'obsidian',
      name: 'Obsidian Black',
      hex: '#1E2220',
      filter: 'saturate(0.2) brightness(0.8) contrast(1.1)',
    },
    {
      id: 'sandstone',
      name: 'Canyon Clay',
      hex: '#9E856E',
      filter: 'hue-rotate(165deg) saturate(0.78) brightness(1.02)',
    },
  ],
  pure: [
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      isTransparent: true,
    },
    {
      id: 'blue',
      name: 'Aqua Blue',
      hex: '#3A7CA5',
      filter: 'sepia(0.28) hue-rotate(175deg) saturate(1.45) brightness(1.0)',
    },
    {
      id: 'pink',
      name: 'Rose Pink',
      hex: '#E495A6',
      filter: 'sepia(0.32) hue-rotate(306deg) saturate(1.38) brightness(1.04)',
    },
    {
      id: 'sage',
      name: 'Alpine Sage',
      hex: '#48634B',
      filter: 'sepia(0.26) hue-rotate(76deg) saturate(1.18) brightness(0.98)',
    },
    {
      id: 'smoked',
      name: 'Smoked Quartz',
      hex: '#6A7370',
      filter: 'saturate(0.4) brightness(0.86) contrast(1.08)',
    },
    {
      id: 'basalt',
      name: 'Basalt Black',
      hex: '#222624',
      filter: 'saturate(0.18) brightness(0.74) contrast(1.14)',
    },
  ],
  botanical: [
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      isTransparent: true,
    },
    {
      id: 'blue',
      name: 'Glacier Blue',
      hex: '#3A7CA5',
      filter: 'sepia(0.28) hue-rotate(176deg) saturate(1.48) brightness(0.99)',
    },
    {
      id: 'pink',
      name: 'Petal Pink',
      hex: '#E495A6',
      filter: 'sepia(0.32) hue-rotate(306deg) saturate(1.4) brightness(1.04)',
    },
    {
      id: 'sage',
      name: 'Mint Sage',
      hex: '#7EA189',
      filter: 'hue-rotate(-10deg) saturate(1.12)',
    },
    {
      id: 'citrus',
      name: 'Yuzu Gold',
      hex: '#C4C99E',
      filter: 'hue-rotate(12deg) saturate(1.16)',
    },
    {
      id: 'basalt',
      name: 'Basalt Black',
      hex: '#222624',
      filter: 'saturate(0.2) brightness(0.78) contrast(1.12)',
    },
  ],
  rose: [
    { id: 'pink', name: 'Rose Quartz Pink', hex: '#D69A94' },
    {
      id: 'blue',
      name: 'Ocean Blue',
      hex: '#3A7CA5',
      filter: 'hue-rotate(196deg) saturate(1.25) brightness(0.96)',
    },
    {
      id: 'transparent',
      name: 'Transparent',
      hex: '#E8F2F5',
      filter: 'saturate(0.14) brightness(1.18) contrast(0.92) opacity(0.86)',
      isTransparent: true,
    },
    {
      id: 'sage',
      name: 'Alpine Sage',
      hex: '#48634B',
      filter: 'hue-rotate(106deg) saturate(0.86) brightness(0.94)',
    },
    {
      id: 'basalt',
      name: 'Basalt Black',
      hex: '#222624',
      filter: 'saturate(0.14) brightness(0.68) contrast(1.16)',
    },
    {
      id: 'glacier',
      name: 'Glacier Silver',
      hex: '#B4BDB8',
      filter: 'saturate(0.1) brightness(1.16) contrast(0.96)',
    },
  ],
};

interface RawProductSeed {
  name: string;
  category: CategoryId;
  variety: string;
  material: string;
  price: number;
  capacity: string;
  highlightSpec: string;
  weight: string;
  rating: number;
  reviews: number;
  description: string;
  finishSet: keyof typeof FINISH_SETS;
  sizes: ProductSize[];
  image: string;
  imageFocus?: string;
  featured?: boolean;
  tag?: string;
}

const RAW_SEEDS: RawProductSeed[] = [
  // =========================================================================
  // 1. INSULATED BOTTLES & FLASKS (15 products — led by Premium Pink Edition)
  // =========================================================================
  {
    name: 'Waterholic Rose Quartz Premium Bottle',
    category: 'bottles',
    variety: 'Premium Pink Bottle',
    material: '18/8 Stainless Steel',
    price: 88,
    capacity: '950 ml',
    highlightSpec: '36h cold · 18h hot · Copper core',
    weight: '490 g',
    rating: 5.0,
    reviews: 1480,
    description:
      'Limited-edition matte rose-pink luxury hydration bottle featuring a triple-wall copper thermal core, brushed champagne-steel collar, and laser-etched Waterholic emblem.',
    finishSet: 'rose',
    sizes: [
      { label: '750 ml', priceDelta: -10 },
      { label: '950 ml', priceDelta: 0 },
      { label: '1.2 L', priceDelta: 12 },
    ],
    image: pinkPremiumBottleImg,
    featured: true,
    tag: 'Premium Edition',
  },
  {
    name: 'Waterholic Flagship Flask',
    category: 'bottles',
    variety: 'Wide-Mouth Flask',
    material: '18/8 Stainless Steel',
    price: 48,
    capacity: '950 ml',
    highlightSpec: '24h cold · 12h hot',
    weight: '520 g',
    rating: 4.9,
    reviews: 1410,
    description:
      'Signature double-wall vacuum insulated bottle with matte ocean powder coat, machined leakproof chug collar, and laser-etched Waterholic droplet logo.',
    finishSet: 'alpine',
    sizes: [
      { label: '750 ml', priceDelta: -6 },
      { label: '950 ml', priceDelta: 0 },
      { label: '1.2 L', priceDelta: 6 },
    ],
    image: FLASK_STUDIO,
    featured: true,
    tag: 'Flagship',
  },
  {
    name: 'Summit Titanium Ultralight Canteen',
    category: 'bottles',
    variety: 'Titanium Canteen',
    material: 'Grade 1 Titanium',
    price: 94,
    capacity: '800 ml',
    highlightSpec: 'Zero metallic taste',
    weight: '195 g',
    rating: 4.9,
    reviews: 1240,
    description:
      'Featherweight raw brushed Grade 1 titanium water canteen engineered for thru-hikers and alpine ascents with precision-etched Waterholic mark.',
    finishSet: 'mineral',
    sizes: [
      { label: '600 ml', priceDelta: -12 },
      { label: '800 ml', priceDelta: 0 },
      { label: '1.0 L', priceDelta: 14 },
    ],
    image: titaniumCanteenImg,
    featured: true,
    tag: 'Ultralight',
  },
  {
    name: 'Glacier Ceramic-Lined Pure Bottle',
    category: 'bottles',
    variety: 'Ceramic-Lined Bottle',
    material: 'Ceramic / Stoneware',
    price: 52,
    capacity: '750 ml',
    highlightSpec: '20h cold · Pure taste',
    weight: '440 g',
    rating: 4.8,
    reviews: 239,
    description:
      'Kiln-fused interior ceramic lining prevents flavor transfer between crisp water, matcha, and electrolyte infusions.',
    finishSet: 'alpine',
    sizes: [
      { label: '500 ml', priceDelta: -6 },
      { label: '750 ml', priceDelta: 0 },
      { label: '950 ml', priceDelta: 8 },
    ],
    image: FLASK_RIVER,
    featured: true,
  },
  {
    name: 'Commuter Narrow-Spout Bottle',
    category: 'bottles',
    variety: 'Commuter Bottle',
    material: '18/8 Stainless Steel',
    price: 38,
    capacity: '650 ml',
    highlightSpec: 'Fits all cup holders',
    weight: '360 g',
    rating: 4.8,
    reviews: 311,
    description:
      'Slim-profile daily water bottle designed for smooth one-handed pouring during bike commutes and desk sessions.',
    finishSet: 'alpine',
    sizes: [
      { label: '500 ml', priceDelta: -4 },
      { label: '650 ml', priceDelta: 0 },
      { label: '800 ml', priceDelta: 6 },
    ],
    image: FLASK_LAKE,
  },
  {
    name: 'Basecamp 1.5L Wide-Mouth Thermal Canteen',
    category: 'bottles',
    variety: 'Wide-Mouth Canteen',
    material: '18/8 Stainless Steel',
    price: 64,
    capacity: '1.5 L',
    highlightSpec: '36h ice retention',
    weight: '680 g',
    rating: 4.9,
    reviews: 276,
    description:
      'High-volume wide-mouth vacuum canteen with loop-tethered cap and thick-wall thermal core built for full-day excursions.',
    finishSet: 'trail',
    sizes: [
      { label: '1.2 L', priceDelta: -6 },
      { label: '1.5 L', priceDelta: 0 },
      { label: '1.8 L', priceDelta: 10 },
    ],
    image: FLASK_COLD,
    tag: 'Bestseller',
  },
  {
    name: 'Trailhead Straw-Lid Sport Bottle',
    category: 'bottles',
    variety: 'Straw-Lid Bottle',
    material: '18/8 Stainless Steel',
    price: 44,
    capacity: '900 ml',
    highlightSpec: 'High-flow flip straw',
    weight: '470 g',
    rating: 4.7,
    reviews: 198,
    description:
      'Quick-sip angled silicone straw lid paired with a sweat-free matte powder-coated steel body for trail workouts.',
    finishSet: 'alpine',
    sizes: [
      { label: '700 ml', priceDelta: -5 },
      { label: '900 ml', priceDelta: 0 },
      { label: '1.1 L', priceDelta: 6 },
    ],
    image: FLASK_SUNNY,
  },
  {
    name: 'Pocket Ridge Mini Thermal Flask',
    category: 'bottles',
    variety: 'Compact Pocket Flask',
    material: '18/8 Stainless Steel',
    price: 28,
    capacity: '350 ml',
    highlightSpec: 'Fits jacket pockets',
    weight: '220 g',
    rating: 4.8,
    reviews: 152,
    description:
      'Ultra-compact water flask that slips into sling bags and coat pockets while maintaining 18 hours of chilled temperature.',
    finishSet: 'alpine',
    sizes: [
      { label: '280 ml', priceDelta: -4 },
      { label: '350 ml', priceDelta: 0 },
      { label: '450 ml', priceDelta: 4 },
    ],
    image: FLASK_HOT,
  },
  {
    name: 'Copper-Core Frost Vacuum Bottle',
    category: 'bottles',
    variety: 'Wide-Mouth Flask',
    material: '18/8 Stainless Steel',
    price: 58,
    capacity: '1.0 L',
    highlightSpec: '36h sub-zero chill',
    weight: '545 g',
    rating: 4.9,
    reviews: 205,
    description:
      'Triple-layer copper-shielded vacuum core engineered to preserve ice water through desert heat and multi-day trips.',
    finishSet: 'mineral',
    sizes: [
      { label: '750 ml', priceDelta: -8 },
      { label: '1.0 L', priceDelta: 0 },
      { label: '1.5 L', priceDelta: 12 },
    ],
    image: FLASK_COLD,
  },
  {
    name: 'Carbonate Pressurized Growler Bottle',
    category: 'bottles',
    variety: 'Carbonated Bottle',
    material: '18/8 Stainless Steel',
    price: 64,
    capacity: '1.0 L',
    highlightSpec: 'Locks fizz 72 hours',
    weight: '590 g',
    rating: 4.8,
    reviews: 118,
    description:
      'Heavy-gauge thread-lock seal built specifically for sparkling water and botanical tonics without losing carbonation.',
    finishSet: 'mineral',
    sizes: [
      { label: '750 ml', priceDelta: -8 },
      { label: '1.0 L', priceDelta: 0 },
      { label: '1.8 L', priceDelta: 18 },
    ],
    image: FLASK_STUDIO,
  },
  {
    name: 'Borosilicate Grip Studio Bottle',
    category: 'bottles',
    variety: 'Glass Water Bottle',
    material: 'Borosilicate Glass',
    price: 34,
    capacity: '650 ml',
    highlightSpec: 'Silicone impact armor',
    weight: '410 g',
    rating: 4.7,
    reviews: 164,
    description:
      'Lab-grade borosilicate glass bottle wrapped in a tactile matte silicone sleeve for crisp, pure tabletop hydration.',
    finishSet: 'pure',
    sizes: [
      { label: '500 ml', priceDelta: -4 },
      { label: '650 ml', priceDelta: 0 },
      { label: '850 ml', priceDelta: 6 },
    ],
    image: carafeStudioImg,
    imageFocus: 'left',
  },
  {
    name: 'Alpine Junior Splash-Proof Bottle',
    category: 'bottles',
    variety: 'Kids Hydration Bottle',
    material: '18/8 Stainless Steel',
    price: 29,
    capacity: '420 ml',
    highlightSpec: 'Spill-proof bite spout',
    weight: '260 g',
    rating: 4.9,
    reviews: 221,
    description:
      'Dent-resistant kids insulated bottle with soft medical-grade silicone spout and an easy-grip carry loop.',
    finishSet: 'trail',
    sizes: [
      { label: '350 ml', priceDelta: -3 },
      { label: '420 ml', priceDelta: 0 },
      { label: '530 ml', priceDelta: 4 },
    ],
    image: FLASK_RIVER,
  },
  {
    name: 'Kinetic Gym Wide-Grip Bottle',
    category: 'bottles',
    variety: 'Straw-Lid Bottle',
    material: '18/8 Stainless Steel',
    price: 46,
    capacity: '1.2 L',
    highlightSpec: 'Textured wet-grip coat',
    weight: '560 g',
    rating: 4.8,
    reviews: 173,
    description:
      'High-capacity studio and gym water bottle featuring micro-textured grip finish and rapid-fill ice mouth.',
    finishSet: 'alpine',
    sizes: [
      { label: '950 ml', priceDelta: -4 },
      { label: '1.2 L', priceDelta: 0 },
      { label: '1.5 L', priceDelta: 8 },
    ],
    image: FLASK_TRAIL,
  },
  {
    name: 'Monolith Magnetic-Cap Bottle',
    category: 'bottles',
    variety: 'Commuter Bottle',
    material: '18/8 Stainless Steel',
    price: 54,
    capacity: '850 ml',
    highlightSpec: 'Neodymium stowed cap',
    weight: '485 g',
    rating: 4.9,
    reviews: 147,
    description:
      'Precision-knurled magnetic cap docks cleanly onto the side collar while you drink, keeping hands completely free.',
    finishSet: 'alpine',
    sizes: [
      { label: '650 ml', priceDelta: -6 },
      { label: '850 ml', priceDelta: 0 },
      { label: '1.1 L', priceDelta: 8 },
    ],
    image: FLASK_LID,
    tag: 'New',
  },
  {
    name: 'Thermal Infuser Tea & Fruit Bottle',
    category: 'bottles',
    variety: 'Infuser Bottle',
    material: '18/8 Stainless Steel',
    price: 49,
    capacity: '750 ml',
    highlightSpec: 'Laser-etched micro mesh',
    weight: '455 g',
    rating: 4.8,
    reviews: 131,
    description:
      'Removable stainless steel infusion basket steeps cucumber, citrus, or cold-brew leaves cleanly inside vacuum steel.',
    finishSet: 'mineral',
    sizes: [
      { label: '600 ml', priceDelta: -5 },
      { label: '750 ml', priceDelta: 0 },
      { label: '950 ml', priceDelta: 6 },
    ],
    image: FLASK_LAKE,
  },

  // =========================================================================
  // 2. TUMBLERS & HYDRATION MUGS (13 products)
  // =========================================================================
  {
    name: 'Ridge 40 oz Handle Quencher Tumbler',
    category: 'tumblers',
    variety: 'Handle Quencher',
    material: '18/8 Stainless Steel',
    price: 46,
    capacity: '1.18 L (40 oz)',
    highlightSpec: '30h iced · Tapered base',
    weight: '610 g',
    rating: 4.9,
    reviews: 1090,
    description:
      'All-day hydration tumbler with ergonomic comfort-grip handle, splash-resistant lid, brushed stainless straw, and etched Waterholic logo.',
    finishSet: 'alpine',
    sizes: [
      { label: '30 oz', priceDelta: -6 },
      { label: '40 oz', priceDelta: 0 },
      { label: '50 oz', priceDelta: 8 },
    ],
    image: tumblerStudioImg,
    featured: true,
    tag: 'Bestseller',
  },
  {
    name: 'Summit Vacuum Camp Mug',
    category: 'tumblers',
    variety: 'Camp Mug',
    material: '18/8 Stainless Steel',
    price: 32,
    capacity: '400 ml',
    highlightSpec: 'Press-fit sipper lid',
    weight: '290 g',
    rating: 4.8,
    reviews: 880,
    description:
      'Sturdy welded-handle camp mug that keeps dawn pour-over steaming and midday glacier water chilled.',
    finishSet: 'trail',
    sizes: [
      { label: '350 ml', priceDelta: -3 },
      { label: '400 ml', priceDelta: 0 },
      { label: '500 ml', priceDelta: 5 },
    ],
    image: campMugImg,
    featured: true,
  },
  {
    name: 'Cascade Flip-Straw Travel Tumbler',
    category: 'tumblers',
    variety: 'Flip-Straw Cup',
    material: '18/8 Stainless Steel',
    price: 39,
    capacity: '880 ml (30 oz)',
    highlightSpec: '100% leakproof fold',
    weight: '480 g',
    rating: 4.8,
    reviews: 860,
    description:
      'Snap-shut flip straw seals completely tight inside backpacks and car doors without dripping a single drop.',
    finishSet: 'rose',
    sizes: [
      { label: '24 oz', priceDelta: -5 },
      { label: '30 oz', priceDelta: 0 },
      { label: '40 oz', priceDelta: 7 },
    ],
    image: slimTumblerImg,
    featured: true,
  },
  {
    name: 'Studio Stackable Steel Pint Tumbler',
    category: 'tumblers',
    variety: 'Stackable Pint',
    material: '18/8 Stainless Steel',
    price: 26,
    capacity: '475 ml (16 oz)',
    highlightSpec: 'Nesting camp stack',
    weight: '215 g',
    rating: 4.8,
    reviews: 840,
    description:
      'Double-wall pint glass crafted from brushed steel that stacks compactly for picnics, studio desks, and camp kitchens.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Single', priceDelta: 0 },
      { label: '2-Pack', priceDelta: 22 },
      { label: '4-Pack', priceDelta: 68 },
    ],
    image: steelPintImg,
    featured: true,
  },
  {
    name: 'Glacier Cold-Brew & Water Straw Cup',
    category: 'tumblers',
    variety: 'Handle Quencher',
    material: '18/8 Stainless Steel',
    price: 36,
    capacity: '710 ml (24 oz)',
    highlightSpec: 'Silicone-tip steel straw',
    weight: '390 g',
    rating: 4.7,
    reviews: 162,
    description:
      'Balanced everyday straw cup with soft-touch silicone straw tip and silent non-slip base pad.',
    finishSet: 'alpine',
    sizes: [
      { label: '20 oz', priceDelta: -4 },
      { label: '24 oz', priceDelta: 0 },
      { label: '32 oz', priceDelta: 6 },
    ],
    image: tumblerStudioImg,
  },
  {
    name: 'Aether Stemless Sparkling Water Chiller',
    category: 'tumblers',
    variety: 'Stemless Tumbler',
    material: '18/8 Stainless Steel',
    price: 28,
    capacity: '355 ml (12 oz)',
    highlightSpec: 'Thin rolled drink lip',
    weight: '195 g',
    rating: 4.8,
    reviews: 141,
    description:
      'Tactile curved tumbler tuned for crisp chilled sparkling water, mocktails, or poolside hydration with zero condensation.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Single', priceDelta: 0 },
      { label: 'Pair (2x)', priceDelta: 24 },
    ],
    image: tumblerStudioImg,
  },
  {
    name: 'Commuter 360-Degree Spill-Lock Mug',
    category: 'tumblers',
    variety: 'Travel Tumbler',
    material: '18/8 Stainless Steel',
    price: 41,
    capacity: '500 ml',
    highlightSpec: 'Drink from any angle',
    weight: '340 g',
    rating: 4.9,
    reviews: 214,
    description:
      'Push-button 360-degree valve lets you sip naturally from any edge and locks dry when tossed into a commuter tote.',
    finishSet: 'alpine',
    sizes: [
      { label: '350 ml', priceDelta: -5 },
      { label: '500 ml', priceDelta: 0 },
      { label: '600 ml', priceDelta: 5 },
    ],
    image: tumblerStudioImg,
    tag: 'New',
  },
  {
    name: 'Frost Sleeve Slim Can Water Cooler',
    category: 'tumblers',
    variety: 'Can Chiller',
    material: '18/8 Stainless Steel',
    price: 25,
    capacity: '355 ml (12 oz)',
    highlightSpec: 'Grips standard & slim cans',
    weight: '210 g',
    rating: 4.7,
    reviews: 138,
    description:
      'Vacuum-insulated gasket sleeve turns any canned sparkling water into a 6-hour frosty refreshment without wet hands.',
    finishSet: 'trail',
    sizes: [
      { label: '12 oz Slim', priceDelta: 0 },
      { label: '12 oz Standard', priceDelta: 0 },
      { label: '16 oz Tall', priceDelta: 4 },
    ],
    image: tumblerStudioImg,
  },
  {
    name: 'Borosilicate Sleeve Iced Water Tumbler',
    category: 'tumblers',
    variety: 'Glass Tumbler',
    material: 'Borosilicate Glass',
    price: 30,
    capacity: '590 ml (20 oz)',
    highlightSpec: 'Bamboo lid + glass straw',
    weight: '330 g',
    rating: 4.8,
    reviews: 187,
    description:
      'Crystal-clear tempered glass tumbler nested inside a sage silicone grip with sustainable bamboo lid.',
    finishSet: 'pure',
    sizes: [
      { label: '16 oz', priceDelta: -4 },
      { label: '20 oz', priceDelta: 0 },
      { label: '24 oz', priceDelta: 4 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Ceramic-Coat Desk Hydration Tumbler',
    category: 'tumblers',
    variety: 'Travel Tumbler',
    material: 'Ceramic / Stoneware',
    price: 42,
    capacity: '530 ml (18 oz)',
    highlightSpec: 'True-taste ceramic core',
    weight: '375 g',
    rating: 4.9,
    reviews: 169,
    description:
      'Blends double-wall thermal steel with a smooth interior ceramic glaze for crisp mineral water all workday.',
    finishSet: 'mineral',
    sizes: [
      { label: '14 oz', priceDelta: -4 },
      { label: '18 oz', priceDelta: 0 },
      { label: '24 oz', priceDelta: 6 },
    ],
    image: tumblerStudioImg,
  },
  {
    name: 'Alpine Titanium Double-Wall Mug',
    category: 'tumblers',
    variety: 'Camp Mug',
    material: 'Grade 1 Titanium',
    price: 68,
    capacity: '450 ml',
    highlightSpec: 'Folding wire handles',
    weight: '138 g',
    rating: 4.9,
    reviews: 97,
    description:
      'Ultralight double-wall titanium mug with collapsible handles built for high-altitude camp boiling and sipping.',
    finishSet: 'mineral',
    sizes: [
      { label: '300 ml', priceDelta: -10 },
      { label: '450 ml', priceDelta: 0 },
      { label: '600 ml', priceDelta: 12 },
    ],
    image: tumblerStudioImg,
  },
  {
    name: 'Botanical Steep Glass Infuser Tumbler',
    category: 'tumblers',
    variety: 'Glass Tumbler',
    material: 'Borosilicate Glass',
    price: 38,
    capacity: '500 ml',
    highlightSpec: 'Double-wall zero sweat',
    weight: '360 g',
    rating: 4.7,
    reviews: 112,
    description:
      'Suspended double-wall glass tumbler with fine steel strainer for mint, berries, or loose-leaf cold infusions.',
    finishSet: 'pure',
    sizes: [
      { label: '420 ml', priceDelta: -4 },
      { label: '500 ml', priceDelta: 0 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Expedition 64 oz Crew Handle Tankard',
    category: 'tumblers',
    variety: 'Handle Quencher',
    material: '18/8 Stainless Steel',
    price: 62,
    capacity: '1.9 L (64 oz)',
    highlightSpec: '40h ice · Mega handle',
    weight: '840 g',
    rating: 4.9,
    reviews: 154,
    description:
      'Half-gallon insulated hydration tankard engineered for long road trips, job sites, and full-day studio shifts.',
    finishSet: 'trail',
    sizes: [
      { label: '50 oz', priceDelta: -8 },
      { label: '64 oz', priceDelta: 0 },
    ],
    image: tumblerStudioImg,
  },

  // =========================================================================
  // 3. WATER FILTERS & PURIFIERS (13 products)
  // =========================================================================
  {
    name: 'Lumina UV-C Self-Cleaning Bottle',
    category: 'filters',
    variety: 'UV-C Purifier',
    material: '18/8 Stainless Steel',
    price: 118,
    capacity: '740 ml',
    highlightSpec: '99.99% UV-C in 60s',
    weight: '420 g',
    rating: 4.9,
    reviews: 785,
    description:
      'Built-in medical-grade UV-C LED cap neutralizes bio-contaminants every two hours and keeps bottle odor-free.',
    finishSet: 'alpine',
    sizes: [
      { label: '500 ml', priceDelta: -14 },
      { label: '740 ml', priceDelta: 0 },
      { label: '1.0 L', priceDelta: 18 },
    ],
    image: filterStudioImg,
    featured: true,
    tag: 'Bestseller',
  },
  {
    name: 'PureFlow Glass Carbon Filter Pitcher',
    category: 'filters',
    variety: 'Filter Pitcher',
    material: 'Borosilicate Glass',
    price: 74,
    capacity: '2.4 L (10 cups)',
    highlightSpec: 'Removes PFAS & lead',
    weight: '1.15 kg',
    rating: 4.8,
    reviews: 745,
    description:
      'Plastic-free borosilicate glass water filter pitcher with coconut-shell activated carbon core and bamboo lid.',
    finishSet: 'pure',
    sizes: [
      { label: 'Pitcher + 1 Filter', priceDelta: 0 },
      { label: 'Pitcher + 4 Filters', priceDelta: 28 },
    ],
    image: bottleCampusDormLogoImg,
    featured: true,
  },
  {
    name: 'Backcountry 4L Gravity Water Filter',
    category: 'filters',
    variety: 'Gravity & Pump Filter',
    material: 'BPA-Free Silicone / TPU',
    price: 89,
    capacity: '4.0 L Reservoir',
    highlightSpec: '0.1 micron · 1.75 L/min',
    weight: '295 g',
    rating: 4.9,
    reviews: 194,
    description:
      'Hands-free hangable backcountry gravity filtration system turning alpine stream water into crisp drinking water.',
    finishSet: 'trail',
    sizes: [
      { label: '4L Camp Kit', priceDelta: 0 },
      { label: '6L Group Kit', priceDelta: 18 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Strider Hollow-Fiber Trail Straw',
    category: 'filters',
    variety: 'Trail Microfilter',
    material: '18/8 Stainless Steel',
    price: 36,
    capacity: '4,000 L Lifetime',
    highlightSpec: '0.1 micron · Ultralight',
    weight: '62 g',
    rating: 4.8,
    reviews: 412,
    description:
      'Pocket-sized steel-sheathed personal filtration straw letting hikers drink safely straight from mountain creeks.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Single Straw', priceDelta: 0 },
      { label: '2-Pack Trail Set', priceDelta: 30 },
    ],
    image: filterStudioImg,
    tag: 'Trail Ready',
  },
  {
    name: 'Aqualith Countertop Reverse Osmosis Unit',
    category: 'filters',
    variety: 'Countertop Purifier',
    material: 'Borosilicate Glass',
    price: 349,
    capacity: '4.5 L Tank',
    highlightSpec: '4-stage RO + remineralize',
    weight: '5.4 kg',
    rating: 4.9,
    reviews: 168,
    description:
      'Zero-installation countertop RO purifier with removable glass carafe and natural trace mineral restoration stage.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Standard Unit', priceDelta: 0 },
      { label: 'Unit + 2-Yr Filter Kit', priceDelta: 65 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Under-Sink Dual-Stage Mineral Purifier',
    category: 'filters',
    variety: 'Under-Sink System',
    material: '18/8 Stainless Steel',
    price: 189,
    capacity: '15,000 L Capacity',
    highlightSpec: 'NSF 42/53/401 rated',
    weight: '3.2 kg',
    rating: 4.8,
    reviews: 127,
    description:
      'Direct cold-line filtration housing with quick-twist cartridges that eliminate chlorine, microplastics, and heavy metals.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Dual-Stage Core', priceDelta: 0 },
      { label: 'Triple-Stage Pro', priceDelta: 55 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'TrailPress Ultrafiltration Travel Bottle',
    category: 'filters',
    variety: 'Trail Microfilter',
    material: 'BPA-Free Silicone / TPU',
    price: 92,
    capacity: '710 ml',
    highlightSpec: 'Purifies in 8 seconds',
    weight: '435 g',
    rating: 4.9,
    reviews: 231,
    description:
      'Press-style travel purifier bottle removing viruses, bacteria, protozoa, and sediment on international trips.',
    finishSet: 'trail',
    sizes: [
      { label: '500 ml Compact', priceDelta: -12 },
      { label: '710 ml Expedition', priceDelta: 0 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Alkaline Mineralization Counter Pitcher',
    category: 'filters',
    variety: 'Filter Pitcher',
    material: 'Borosilicate Glass',
    price: 68,
    capacity: '2.2 L',
    highlightSpec: 'Balances to pH 8.5',
    weight: '1.05 kg',
    rating: 4.7,
    reviews: 146,
    description:
      'Multi-media ceramic bead cartridge filters tap impurities while infusing calcium, magnesium, and potassium.',
    finishSet: 'pure',
    sizes: [
      { label: '2.2 L Pitcher', priceDelta: 0 },
      { label: '3.2 L Family Size', priceDelta: 14 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Squeeze Microfilter Soft-Pouch Kit',
    category: 'filters',
    variety: 'Trail Microfilter',
    material: 'BPA-Free Silicone / TPU',
    price: 44,
    capacity: '1.0 L Pouch',
    highlightSpec: 'Weighs just 85 g',
    weight: '85 g',
    rating: 4.8,
    reviews: 208,
    description:
      'Compact squeeze-through hollow-fiber filter threading directly onto collapsible pouches and standard trail bottles.',
    finishSet: 'trail',
    sizes: [
      { label: '1L Pouch Kit', priceDelta: 0 },
      { label: '2L Dual Pouch Kit', priceDelta: 12 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Expedition Ceramic Camp Pump Purifier',
    category: 'filters',
    variety: 'Gravity & Pump Filter',
    material: 'Ceramic / Stoneware',
    price: 112,
    capacity: '50,000 L Element',
    highlightSpec: 'Field-cleanable ceramic',
    weight: '410 g',
    rating: 4.9,
    reviews: 94,
    description:
      'Silver-impregnated ceramic hand-pump water filter built for silty glacial rivers and extended overland travel.',
    finishSet: 'trail',
    sizes: [
      { label: 'Pump System', priceDelta: 0 },
      { label: 'System + Spare Core', priceDelta: 38 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Faucet-Mount Brushed Steel Tap Filter',
    category: 'filters',
    variety: 'Countertop Purifier',
    material: '18/8 Stainless Steel',
    price: 58,
    capacity: '1,200 L Cartridge',
    highlightSpec: 'Switch stream / filtered',
    weight: '340 g',
    rating: 4.7,
    reviews: 175,
    description:
      'Tool-free machined stainless faucet filter delivering crisp, chlorine-free water straight from any kitchen tap.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Mount + 1 Filter', priceDelta: 0 },
      { label: 'Mount + 3 Filters', priceDelta: 24 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Activated Coconut Carbon Filter 4-Pack',
    category: 'filters',
    variety: 'Replacement Cartridges',
    material: 'Natural Mineral / Botanical',
    price: 38,
    capacity: '600 L Total',
    highlightSpec: 'Compostable carbon core',
    weight: '320 g',
    rating: 4.9,
    reviews: 318,
    description:
      'Universal Waterholic pitcher replacement cartridges crafted from sustainable coconut-shell carbon and ion resin.',
    finishSet: 'mineral',
    sizes: [
      { label: '4-Pack (8 Months)', priceDelta: 0 },
      { label: '8-Pack (16 Months)', priceDelta: 30 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'UV-C Travel Sterilizer Immersion Wand',
    category: 'filters',
    variety: 'UV-C Purifier',
    material: '18/8 Stainless Steel',
    price: 84,
    capacity: '1.0 L / 90 sec',
    highlightSpec: 'USB-C · 40 cycles/charge',
    weight: '142 g',
    rating: 4.8,
    reviews: 119,
    description:
      'Portable waterproof UV-C light wand that sanitizes drinking water in any glass, mug, or bottle while traveling.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Wand + Travel Case', priceDelta: 0 },
    ],
    image: filterStudioImg,
    tag: 'New',
  },

  // =========================================================================
  // 4. PITCHERS, CARAFES & DISPENSERS (13 products)
  // =========================================================================
  {
    name: 'Nordic Borosilicate Bedside Carafe Set',
    category: 'carafes',
    variety: 'Bedside Carafe',
    material: 'Borosilicate Glass',
    price: 42,
    capacity: '850 ml',
    highlightSpec: 'Tumbler doubles as lid',
    weight: '430 g',
    rating: 4.9,
    reviews: 775,
    description:
      'Hand-blown clear borosilicate bedside water carafe topped with a matching drinking glass to keep dust out overnight.',
    finishSet: 'pure',
    sizes: [
      { label: '850 ml Set', priceDelta: 0 },
      { label: '1.2 L Set', priceDelta: 8 },
    ],
    image: carafeStudioImg,
    featured: true,
    tag: 'Bestseller',
  },
  {
    name: 'Honed Ceramic Minimalist Pour-Over Carafe',
    category: 'carafes',
    variety: 'Pour-Over Carafe',
    material: 'Ceramic / Stoneware',
    price: 54,
    capacity: '1.1 L',
    highlightSpec: 'Drip-free tapered spout',
    weight: '760 g',
    rating: 4.9,
    reviews: 463,
    description:
      'Slim mineral-glazed ceramic pour-over water carafe designed for studio desks and intimate dining tables.',
    finishSet: 'mineral',
    sizes: [
      { label: '1.1 L Carafe', priceDelta: 0 },
      { label: 'Carafe + 2 Cups', priceDelta: 24 },
    ],
    image: ceramicJugImg,
  },
  {
    name: 'Crystal Double-Wall Dining Water Pitcher',
    category: 'carafes',
    variety: 'Table Pitcher',
    material: 'Borosilicate Glass',
    price: 54,
    capacity: '1.5 L',
    highlightSpec: 'Zero table rings',
    weight: '640 g',
    rating: 4.8,
    reviews: 141,
    description:
      'Insulated double-wall glass pitcher suspends iced citrus water in mid-air with zero exterior condensation.',
    finishSet: 'pure',
    sizes: [
      { label: '1.2 L', priceDelta: -6 },
      { label: '1.5 L', priceDelta: 0 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Bamboo-Lid Slim Fridge Door Carafe',
    category: 'carafes',
    variety: 'Fridge Carafe',
    material: 'Borosilicate Glass',
    price: 34,
    capacity: '1.2 L',
    highlightSpec: 'Fits narrow fridge shelves',
    weight: '490 g',
    rating: 4.8,
    reviews: 218,
    description:
      'Silicone-sealed bamboo cap and narrow cylindrical footprint make chilled everyday water effortless to pour.',
    finishSet: 'pure',
    sizes: [
      { label: '1.2 L', priceDelta: 0 },
      { label: '1.8 L', priceDelta: 6 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Gravity Ceramic Countertop Water Crock',
    category: 'carafes',
    variety: 'Water Dispenser',
    material: 'Ceramic / Stoneware',
    price: 128,
    capacity: '8.5 L',
    highlightSpec: 'Stainless steel spigot',
    weight: '4.1 kg',
    rating: 4.9,
    reviews: 112,
    description:
      'Lead-free glazed stoneware water dispenser resting on a solid oak stand for kitchen counters and studio lounges.',
    finishSet: 'mineral',
    sizes: [
      { label: '8.5 L + Oak Stand', priceDelta: 0 },
      { label: '11 L + Oak Stand', priceDelta: 24 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Ice-Core Botanical Infusion Pitcher',
    category: 'carafes',
    variety: 'Infuser Pitcher',
    material: 'Borosilicate Glass',
    price: 46,
    capacity: '2.0 L',
    highlightSpec: 'Chills without dilution',
    weight: '720 g',
    rating: 4.7,
    reviews: 159,
    description:
      'Interchangeable central ice tube and perforated botanical cylinder keep fruit-infused water crisp and undiluted.',
    finishSet: 'pure',
    sizes: [
      { label: '1.6 L', priceDelta: -6 },
      { label: '2.0 L', priceDelta: 0 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Basecamp 5L Insulated Beverage Dispenser',
    category: 'carafes',
    variety: 'Water Dispenser',
    material: '18/8 Stainless Steel',
    price: 114,
    capacity: '5.0 L',
    highlightSpec: '36h ice · Fast-flow tap',
    weight: '2.1 kg',
    rating: 4.9,
    reviews: 134,
    description:
      'Heavy-duty vacuum stainless water cooler with lockable pour spigot built for outdoor gatherings and trail camps.',
    finishSet: 'alpine',
    sizes: [
      { label: '5.0 L', priceDelta: 0 },
      { label: '7.5 L', priceDelta: 28 },
    ],
    image: FLASK_COLD,
  },
  {
    name: 'Hammered Pure Copper Ayurvedic Carafe',
    category: 'carafes',
    variety: 'Bedside Carafe',
    material: '18/8 Stainless Steel',
    price: 66,
    capacity: '1.1 L',
    highlightSpec: 'Hand-forged copper vessel',
    weight: '510 g',
    rating: 4.8,
    reviews: 187,
    description:
      'Artisan-hammered unlined copper water carafe with matching tumbler crafted for overnight traditional hydration rituals.',
    finishSet: 'trail',
    sizes: [
      { label: '1.1 L Carafe', priceDelta: 0 },
      { label: 'Carafe + 2 Tumblers', priceDelta: 28 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Fluted Architectural Table Decanter',
    category: 'carafes',
    variety: 'Table Pitcher',
    material: 'Borosilicate Glass',
    price: 48,
    capacity: '1.0 L',
    highlightSpec: 'Vertical optical flutes',
    weight: '470 g',
    rating: 4.9,
    reviews: 129,
    description:
      'Mouth-blown ribbed water decanter with precision-ground glass stopper that catches natural daylight across the table.',
    finishSet: 'pure',
    sizes: [
      { label: '1.0 L', priceDelta: 0 },
      { label: '1.5 L', priceDelta: 10 },
    ],
    image: carafeStudioImg,
    tag: 'New',
  },
  {
    name: 'Thermal Vacuum Stainless Table Carafe',
    category: 'carafes',
    variety: 'Table Pitcher',
    material: '18/8 Stainless Steel',
    price: 62,
    capacity: '1.5 L',
    highlightSpec: 'One-thumb lever pour',
    weight: '790 g',
    rating: 4.8,
    reviews: 165,
    description:
      'Sleek matte stainless serving carafe retaining ice water for 24 hours or herbal hot water for 12 hours at the table.',
    finishSet: 'alpine',
    sizes: [
      { label: '1.0 L', priceDelta: -8 },
      { label: '1.5 L', priceDelta: 0 },
      { label: '2.0 L', priceDelta: 10 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'One-Touch Electric Gallon Water Pump',
    category: 'carafes',
    variety: 'Water Dispenser',
    material: '18/8 Stainless Steel',
    price: 39,
    capacity: 'Fits 2–5 Gal Jugs',
    highlightSpec: 'USB-C · 40-day battery',
    weight: '310 g',
    rating: 4.7,
    reviews: 243,
    description:
      'Whisper-quiet brushed steel automatic dispenser pump with measured 300 ml and 600 ml one-tap pour presets.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Standard Spout', priceDelta: 0 },
      { label: 'Foldable Spout Pro', priceDelta: 9 },
    ],
    image: filterStudioImg,
  },
  {
    name: 'Self-Chilling Freezer-Core Carafe',
    category: 'carafes',
    variety: 'Fridge Carafe',
    material: 'Borosilicate Glass',
    price: 44,
    capacity: '1.1 L',
    highlightSpec: 'Drop-in gel chill base',
    weight: '680 g',
    rating: 4.8,
    reviews: 92,
    description:
      'Weighted freezer-gel cradle keeps table water briskly chilled outdoors for two hours without adding melting ice.',
    finishSet: 'pure',
    sizes: [
      { label: '1.1 L Carafe', priceDelta: 0 },
    ],
    image: carafeStudioImg,
  },
  {
    name: 'Overland 11L Stainless Camp Water Tank',
    category: 'carafes',
    variety: 'Water Dispenser',
    material: '18/8 Stainless Steel',
    price: 158,
    capacity: '11.0 L',
    highlightSpec: 'Flat-pack roof rack fit',
    weight: '3.4 kg',
    rating: 4.9,
    reviews: 88,
    description:
      'Rugged food-grade steel expedition water tank with dual air-vent cap and high-clearance brass-free spigot.',
    finishSet: 'trail',
    sizes: [
      { label: '11 L Tank', priceDelta: 0 },
      { label: '19 L Expedition Tank', priceDelta: 42 },
    ],
    image: FLASK_TRAIL,
  },

  // =========================================================================
  // 5. HYDRATION PACKS & SOFT FLASKS (13 products)
  // =========================================================================
  {
    name: 'Alpine 8L Trail Running Hydration Vest',
    category: 'packs',
    variety: 'Hydration Vest',
    material: 'BPA-Free Silicone / TPU',
    price: 138,
    capacity: '2 × 500 ml Included',
    highlightSpec: 'Zero-bounce 3D mesh',
    weight: '215 g',
    rating: 4.9,
    reviews: 286,
    description:
      'Breathable ergonomic trail vest supplied with twin collapsible soft flasks and rapid-adjust dual sternum straps.',
    finishSet: 'trail',
    sizes: [
      { label: 'S / M', priceDelta: 0 },
      { label: 'M / L', priceDelta: 0 },
      { label: 'L / XL', priceDelta: 0 },
    ],
    image: packStudioImg,
    tag: 'Trail Ready',
  },
  {
    name: 'FlexStream 500 ml Collapsible Soft Flask',
    category: 'packs',
    variety: 'Soft Flask',
    material: 'BPA-Free Silicone / TPU',
    price: 22,
    capacity: '500 ml',
    highlightSpec: 'Shrinks as you drink',
    weight: '42 g',
    rating: 4.8,
    reviews: 735,
    description:
      'Ultralight TPU soft water flask that compresses as water empties to eliminate sloshing during fast mountain runs.',
    finishSet: 'pure',
    sizes: [
      { label: '250 ml', priceDelta: -4 },
      { label: '500 ml', priceDelta: 0 },
      { label: '750 ml', priceDelta: 4 },
    ],
    image: packStudioImg,
    featured: true,
  },
  {
    name: 'Glacier 3L Collapsible Camp Water Carrier',
    category: 'packs',
    variety: 'Camp Carrier',
    material: 'BPA-Free Silicone / TPU',
    price: 46,
    capacity: '3.0 L',
    highlightSpec: 'Hang-loop gravity spout',
    weight: '190 g',
    rating: 4.9,
    reviews: 215,
    description:
      'Heavy-duty collapsible 3-liter basecamp water carrier with quick-pour tap, reinforced bail strap, and wide drying mouth.',
    finishSet: 'pure',
    sizes: [
      { label: '3.0 L', priceDelta: 0 },
      { label: '6.0 L', priceDelta: 12 },
    ],
    image: hydrationBladderImg,
  },
  {
    name: 'Tempo Waist Hydration Belt + Twin Flasks',
    category: 'packs',
    variety: 'Hydration Belt',
    material: 'BPA-Free Silicone / TPU',
    price: 54,
    capacity: '2 × 300 ml',
    highlightSpec: 'No-chafe stretch weave',
    weight: '165 g',
    rating: 4.7,
    reviews: 149,
    description:
      'Low-profile running waist belt holding two contoured flasks plus secure zip pocket for keys and trail nutrition.',
    finishSet: 'trail',
    sizes: [
      { label: 'S / M', priceDelta: 0 },
      { label: 'L / XL', priceDelta: 0 },
    ],
    image: packStudioImg,
  },
  {
    name: 'Skyline Ultra 15L Alpine Hydration Pack',
    category: 'packs',
    variety: 'Hydration Vest',
    material: 'BPA-Free Silicone / TPU',
    price: 168,
    capacity: '15 L + 2L Bladder',
    highlightSpec: 'Ripstop weather shell',
    weight: '380 g',
    rating: 4.9,
    reviews: 124,
    description:
      'Full-day ridge scramble hydration pack with dedicated thermal reservoir sleeve, pole quivers, and front flask pockets.',
    finishSet: 'trail',
    sizes: [
      { label: 'S / M', priceDelta: 0 },
      { label: 'M / L', priceDelta: 0 },
    ],
    image: packStudioImg,
  },
  {
    name: 'PalmGrip Handheld Running Soft Flask',
    category: 'packs',
    variety: 'Soft Flask',
    material: 'BPA-Free Silicone / TPU',
    price: 28,
    capacity: '500 ml',
    highlightSpec: 'Padded thumb-loop strap',
    weight: '68 g',
    rating: 4.8,
    reviews: 178,
    description:
      'Ergonomic hand-strap water flask letting runners sip effortlessly on 10K training loops without wearing a pack.',
    finishSet: 'trail',
    sizes: [
      { label: '350 ml', priceDelta: -4 },
      { label: '500 ml', priceDelta: 0 },
    ],
    image: packStudioImg,
  },
  {
    name: 'CampCube 10L Foldable Water Carrier',
    category: 'packs',
    variety: 'Camp Carrier',
    material: 'BPA-Free Silicone / TPU',
    price: 34,
    capacity: '10.0 L',
    highlightSpec: 'Packs completely flat',
    weight: '240 g',
    rating: 4.8,
    reviews: 196,
    description:
      'Stand-up collapsible camp water cube with twist-flow spigot and dual webbing handles for basecamp cooking and refills.',
    finishSet: 'pure',
    sizes: [
      { label: '6.0 L', priceDelta: -6 },
      { label: '10.0 L', priceDelta: 0 },
      { label: '15.0 L', priceDelta: 8 },
    ],
    image: packStudioImg,
  },
  {
    name: 'FreezeGuard Winter Insulated Bladder',
    category: 'packs',
    variety: 'Hydration Bladder',
    material: 'BPA-Free Silicone / TPU',
    price: 58,
    capacity: '2.5 L',
    highlightSpec: 'Rated down to -15°C',
    weight: '235 g',
    rating: 4.9,
    reviews: 109,
    description:
      'Closed-cell foam wrapped drink tube and thermal bite-valve cover keep ski-touring hydration flowing in sub-zero air.',
    finishSet: 'mineral',
    sizes: [
      { label: '2.0 L', priceDelta: -4 },
      { label: '2.5 L', priceDelta: 0 },
    ],
    image: packStudioImg,
  },
  {
    name: 'AeroCarbon Bike Frame Bottle Cage Kit',
    category: 'packs',
    variety: 'Cycling Hydration',
    material: 'BPA-Free Silicone / TPU',
    price: 42,
    capacity: '710 ml Squeeze Bottle',
    highlightSpec: 'Side-entry gravel grip',
    weight: '96 g',
    rating: 4.8,
    reviews: 142,
    description:
      'Matte composite bike bottle cage paired with a high-flow dirt-cap squeeze water bottle built for rough gravel descents.',
    finishSet: 'trail',
    sizes: [
      { label: 'Single Kit', priceDelta: 0 },
      { label: 'Dual Frame Set', priceDelta: 34 },
    ],
    image: packStudioImg,
  },
  {
    name: 'Quick-Flow Magnetic Bite Valve Tube Kit',
    category: 'packs',
    variety: 'Hydration Bladder',
    material: 'BPA-Free Silicone / TPU',
    price: 24,
    capacity: '95 cm Drink Tube',
    highlightSpec: 'Snap-back chest magnet',
    weight: '74 g',
    rating: 4.8,
    reviews: 161,
    description:
      'Replacement high-flow silicone bite valve with lockable shutoff switch and magnetic harness clip for any bladder.',
    finishSet: 'pure',
    sizes: [
      { label: 'Standard 95 cm', priceDelta: 0 },
      { label: 'Insulated Sleeve 95 cm', priceDelta: 8 },
    ],
    image: packStudioImg,
  },
  {
    name: 'Thermal Neoprene Reservoir Sleeve',
    category: 'packs',
    variety: 'Hydration Bladder',
    material: 'BPA-Free Silicone / TPU',
    price: 26,
    capacity: 'Fits 2L–3L Bladders',
    highlightSpec: 'Reflective foil core',
    weight: '98 g',
    rating: 4.7,
    reviews: 84,
    description:
      'Slip-in thermal reservoir jacket shields your hydration bladder from body heat during steep summer climbs.',
    finishSet: 'trail',
    sizes: [
      { label: '2L Sleeve', priceDelta: 0 },
      { label: '3L Sleeve', priceDelta: 4 },
    ],
    image: packStudioImg,
  },
  {
    name: 'Junior Trail Explorer 6L Hydration Pack',
    category: 'packs',
    variety: 'Hydration Vest',
    material: 'BPA-Free Silicone / TPU',
    price: 64,
    capacity: '1.5 L Bladder Included',
    highlightSpec: 'Safety whistle buckle',
    weight: '290 g',
    rating: 4.9,
    reviews: 117,
    description:
      'Kid-proportioned daypack featuring an easy-bite 1.5L water reservoir and reflective trail visibility trim.',
    finishSet: 'trail',
    sizes: [
      { label: 'Youth One Size', priceDelta: 0 },
    ],
    image: packStudioImg,
  },
  {
    name: 'Summit Dual-Chamber Electrolyte Bladder',
    category: 'packs',
    variety: 'Hydration Bladder',
    material: 'BPA-Free Silicone / TPU',
    price: 62,
    capacity: '1.5 L + 1.5 L Split',
    highlightSpec: 'Water + Mix separate',
    weight: '245 g',
    rating: 4.8,
    reviews: 95,
    description:
      'Twin-compartment reservoir with dual drink tubes lets endurance athletes alternate plain water and electrolyte mix.',
    finishSet: 'pure',
    sizes: [
      { label: '3.0 L Split', priceDelta: 0 },
    ],
    image: packStudioImg,
    tag: 'New',
  },

  // =========================================================================
  // 6. MINERAL & SPARKLING WATER (13 products)
  // =========================================================================
  {
    name: 'Waterholic Alpine Still Spring Water',
    category: 'mineral',
    variety: 'Still Spring Water',
    material: 'Natural Mineral / Botanical',
    price: 28,
    capacity: '12 × 500 ml Glass',
    highlightSpec: 'pH 7.9 · Naturally filtered',
    weight: '7.4 kg',
    rating: 4.9,
    reviews: 765,
    description:
      'Bottled directly at a protected high-altitude granite aquifer with balanced silica and crisp, silky minerality.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack (500 ml)', priceDelta: 0 },
      { label: '24-Pack (500 ml)', priceDelta: 22 },
      { label: '6-Pack (1L Table)', priceDelta: 4 },
    ],
    image: mineralStudioImg,
    featured: true,
    tag: 'Bestseller',
  },
  {
    name: 'Glacier Crisp Fine-Bubble Sparkling Water',
    category: 'mineral',
    variety: 'Sparkling Mineral',
    material: 'Natural Mineral / Botanical',
    price: 30,
    capacity: '12 × 500 ml Glass',
    highlightSpec: 'Micro-effervescent fizz',
    weight: '7.4 kg',
    rating: 4.9,
    reviews: 356,
    description:
      'High-mineral alpine spring water carbonated to fine champagne-like bubbles for dining tables and refreshing afternoons.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack (500 ml)', priceDelta: 0 },
      { label: '24-Pack (500 ml)', priceDelta: 24 },
    ],
    image: electrolyteCansImg,
  },
  {
    name: 'Yuzu & Bergamot Botanical Sparkling',
    category: 'mineral',
    variety: 'Botanical Infusion',
    material: 'Natural Mineral / Botanical',
    price: 32,
    capacity: '12 × 355 ml Cans',
    highlightSpec: '0g sugar · Real peel oil',
    weight: '4.6 kg',
    rating: 4.8,
    reviews: 228,
    description:
      'Cold-pressed Japanese yuzu and aromatic bergamot essences suspended in crisp sparkling mountain mineral water.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 26 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Cucumber Mint Alpine Botanical Water',
    category: 'mineral',
    variety: 'Botanical Infusion',
    material: 'Natural Mineral / Botanical',
    price: 31,
    capacity: '12 × 355 ml Cans',
    highlightSpec: 'Organic garden hydrosol',
    weight: '4.6 kg',
    rating: 4.8,
    reviews: 194,
    description:
      'Delicately infused still spring water with cool English cucumber and crushed alpine spearmint leaves.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 25 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Peak 8.8 High-Alkaline Mountain Water',
    category: 'mineral',
    variety: 'Alkaline Water',
    material: 'Natural Mineral / Botanical',
    price: 34,
    capacity: '12 × 750 ml Bottles',
    highlightSpec: 'Natural pH 8.8 · No ionizers',
    weight: '9.8 kg',
    rating: 4.9,
    reviews: 241,
    description:
      'Naturally alkaline volcanic-filtered water rich in bioavailable bicarbonate and calcium without artificial additives.',
    finishSet: 'botanical',
    sizes: [
      { label: '12 × 750 ml', priceDelta: 0 },
      { label: '12 × 1.0 L', priceDelta: 8 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Electrolyte Recovery Alpine Spring Water',
    category: 'mineral',
    variety: 'Electrolyte Water',
    material: 'Natural Mineral / Botanical',
    price: 35,
    capacity: '12 × 500 ml Cans',
    highlightSpec: '500mg Na · 200mg K · Mg',
    weight: '6.4 kg',
    rating: 4.9,
    reviews: 263,
    description:
      'Clean unflavored isotonic spring water fortified with balanced sea minerals for rapid post-workout rehydration.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 28 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Wild Blackberry & Sage Sparkling Water',
    category: 'mineral',
    variety: 'Botanical Infusion',
    material: 'Natural Mineral / Botanical',
    price: 32,
    capacity: '12 × 355 ml Cans',
    highlightSpec: 'Zero calories · Crisp finish',
    weight: '4.6 kg',
    rating: 4.8,
    reviews: 171,
    description:
      'Foraged Pacific Northwest blackberry aroma balanced with savory alpine sage in briskly carbonated spring water.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 26 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Ginger Lime Sparkling Mineral Tonic',
    category: 'mineral',
    variety: 'Sparkling Mineral',
    material: 'Natural Mineral / Botanical',
    price: 33,
    capacity: '12 × 355 ml Cans',
    highlightSpec: 'Cold-pressed ginger root',
    weight: '4.6 kg',
    rating: 4.9,
    reviews: 189,
    description:
      'Bright organic key lime zest and warming ginger root essence crafted for invigorating zero-sugar afternoon refreshment.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 26 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Deep-Well Magnesium Mineral Water',
    category: 'mineral',
    variety: 'Still Spring Water',
    material: 'Natural Mineral / Botanical',
    price: 36,
    capacity: '12 × 500 ml Glass',
    highlightSpec: '95 mg/L natural Mg',
    weight: '7.4 kg',
    rating: 4.8,
    reviews: 152,
    description:
      'Drawn from dolomite mineral strata to deliver naturally occurring magnesium for evening calm and muscle recovery.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
      { label: '24-Pack', priceDelta: 28 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Hibiscus & Rosewater Botanical Hydrator',
    category: 'mineral',
    variety: 'Botanical Infusion',
    material: 'Natural Mineral / Botanical',
    price: 33,
    capacity: '12 × 355 ml Cans',
    highlightSpec: 'Steeped crimson petals',
    weight: '4.6 kg',
    rating: 4.7,
    reviews: 138,
    description:
      'Lightly floral steeped hibiscus blossom and Damascus rosewater balanced in crisp chilled alpine water.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack', priceDelta: 0 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Himalayan Trace Mineral Electrolyte Drops',
    category: 'mineral',
    variety: 'Hydration Mixes',
    material: 'Natural Mineral / Botanical',
    price: 26,
    capacity: '120 ml Dropper (60 srv)',
    highlightSpec: '72 ionic trace minerals',
    weight: '210 g',
    rating: 4.9,
    reviews: 312,
    description:
      'Concentrated ionic mineral drops that instantly upgrade filtered or RO water into balanced mineral-rich hydration.',
    finishSet: 'mineral',
    sizes: [
      { label: '60 Servings', priceDelta: 0 },
      { label: '120 Servings', priceDelta: 18 },
    ],
    image: mineralStudioImg,
    tag: 'New',
  },
  {
    name: 'Alpine Citrus Daily Electrolyte Sticks',
    category: 'mineral',
    variety: 'Hydration Mixes',
    material: 'Natural Mineral / Botanical',
    price: 38,
    capacity: '30 Stick Packs',
    highlightSpec: 'Zero sugar · 1000mg Na',
    weight: '240 g',
    rating: 4.9,
    reviews: 279,
    description:
      'Clean science-backed hydration powder sticks formulated for trail endurance, sauna sessions, and high-altitude travel.',
    finishSet: 'botanical',
    sizes: [
      { label: '30-Pack Box', priceDelta: 0 },
      { label: '60-Pack Value', priceDelta: 30 },
    ],
    image: mineralStudioImg,
  },
  {
    name: 'Countertop Sparkling Water Carbonator',
    category: 'mineral',
    variety: 'Sparkling Makers',
    material: '18/8 Stainless Steel',
    price: 198,
    capacity: 'Includes 800 ml Bottle',
    highlightSpec: 'Machined brass-free lever',
    weight: '2.3 kg',
    rating: 4.9,
    reviews: 214,
    description:
      'Full stainless steel cordless sparkling water maker that turns cold tap or filtered water effervescent in three seconds.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Carbonator + 1 Cylinder', priceDelta: 0 },
      { label: 'Carbonator + 2 Cylinders', priceDelta: 28 },
    ],
    image: mineralStudioImg,
  },

  // =========================================================================
  // 7. ICE, CHILLERS & BARWARE (13 products)
  // =========================================================================
  {
    name: 'Directional Clear Sphere Ice Press Mold',
    category: 'ice',
    variety: 'Ice Molds',
    material: 'BPA-Free Silicone / TPU',
    price: 42,
    capacity: '4 × 60 mm Spheres',
    highlightSpec: 'Zero-bubble crystal ice',
    weight: '680 g',
    rating: 4.9,
    reviews: 294,
    description:
      'Insulated directional freezing chamber pushes trapped air downward to craft glass-clear slow-melting ice spheres.',
    finishSet: 'mineral',
    sizes: [
      { label: '4-Sphere Mold', priceDelta: 0 },
      { label: 'Sphere + Cube Bundle', priceDelta: 34 },
    ],
    image: iceStudioImg,
    tag: 'Bestseller',
  },
  {
    name: 'Glacier Vacuum Countertop Pebble Ice Caddy',
    category: 'ice',
    variety: 'Ice Caddies',
    material: '18/8 Stainless Steel',
    price: 68,
    capacity: '2.6 L',
    highlightSpec: '10h nugget ice · Scoop incl.',
    weight: '1.15 kg',
    rating: 4.9,
    reviews: 178,
    description:
      'Sweat-free architectural vacuum ice caddy with hinged flip lid, removable melt strainer, and brushed steel pebble scoop.',
    finishSet: 'mineral',
    sizes: [
      { label: '2.6 L Standard', priceDelta: 0 },
      { label: '4.0 L Party Size', priceDelta: 20 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Fluted Heavyweight Crystal Water Glasses',
    category: 'ice',
    variety: 'Water Glassware',
    material: 'Borosilicate Glass',
    price: 48,
    capacity: 'Set of 4 × 380 ml',
    highlightSpec: 'Lead-free optical crystal',
    weight: '1.24 kg',
    rating: 4.9,
    reviews: 236,
    description:
      'Weighted ribbed water tumblers shaped to showcase large clear ice spheres and refract crisp daylight at the table.',
    finishSet: 'pure',
    sizes: [
      { label: 'Set of 4 (Lowball)', priceDelta: 0 },
      { label: 'Set of 4 (Highball)', priceDelta: 6 },
      { label: 'Set of 8 Mixed', priceDelta: 42 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Glacier Rapid-Chill Countertop Ice Maker',
    category: 'ice',
    variety: 'Ice Makers',
    material: '18/8 Stainless Steel',
    price: 289,
    capacity: '15 kg / 24h Output',
    highlightSpec: 'Soft chewable pebble ice',
    weight: '11.2 kg',
    rating: 4.8,
    reviews: 162,
    description:
      'Compact matte brushed stainless countertop machine producing restaurant-grade crunchy nugget ice in 10 minutes.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Standard Unit', priceDelta: 0 },
      { label: 'Unit + Side Water Tank', priceDelta: 35 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Bottle-Neck Ice Stick Silicone Tray',
    category: 'ice',
    variety: 'Ice Molds',
    material: 'BPA-Free Silicone / TPU',
    price: 18,
    capacity: '10 Slim Ice Rods',
    highlightSpec: 'Fits narrow bottle necks',
    weight: '220 g',
    rating: 4.8,
    reviews: 304,
    description:
      'Steel-framed platinum silicone tray molding slender cylindrical ice sticks that slide smoothly into any flask mouth.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Single Tray', priceDelta: 0 },
      { label: '2-Pack Trays', priceDelta: 14 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Oversized 50 mm Clear Cube Silicone Tray',
    category: 'ice',
    variety: 'Ice Molds',
    material: 'BPA-Free Silicone / TPU',
    price: 22,
    capacity: '6 King Cubes',
    highlightSpec: 'Stackable airtight lid',
    weight: '295 g',
    rating: 4.8,
    reviews: 189,
    description:
      'Rigid internal steel rim prevents freezer spills while the flexible silicone base pops out razor-sharp king cubes.',
    finishSet: 'mineral',
    sizes: [
      { label: '6-Cube Tray', priceDelta: 0 },
      { label: '2-Pack Bundle', priceDelta: 18 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Nordic Granite Reusable Water Chilling Stones',
    category: 'ice',
    variety: 'Chilling Accessories',
    material: 'Natural Mineral / Botanical',
    price: 32,
    capacity: 'Set of 6 Stones',
    highlightSpec: 'Zero dilution chill',
    weight: '380 g',
    rating: 4.7,
    reviews: 121,
    description:
      'Hand-honed non-porous alpine soapstone cubes chill water and botanical tonics gently without altering flavor.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Set of 6 + Pouch', priceDelta: 0 },
      { label: 'Set of 12 + Tray', priceDelta: 24 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Insulated Camp Ice-Cube Transport Caddy',
    category: 'ice',
    variety: 'Ice Buckets',
    material: '18/8 Stainless Steel',
    price: 76,
    capacity: '3.2 L',
    highlightSpec: '32h solid ice on trail',
    weight: '1.35 kg',
    rating: 4.9,
    reviews: 114,
    description:
      'Leakproof twist-lock vacuum cylinder designed to haul frozen ice cubes to campsites, beaches, and summer picnics.',
    finishSet: 'alpine',
    sizes: [
      { label: '3.2 L Caddy', priceDelta: 0 },
      { label: '5.0 L Expedition', priceDelta: 22 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Manual Stainless Crushed Ice Hand Mill',
    category: 'ice',
    variety: 'Ice Makers',
    material: '18/8 Stainless Steel',
    price: 46,
    capacity: '750 ml Catch Bin',
    highlightSpec: 'Zero-power fine snow',
    weight: '890 g',
    rating: 4.7,
    reviews: 93,
    description:
      'Precision stainless blades shave standard freezer cubes into crisp snow-cone and Agua Fresca crushed ice in seconds.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Countertop Mill', priceDelta: 0 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Double-Wall Freezer Ice Bin & Steel Scoop',
    category: 'ice',
    variety: 'Ice Buckets',
    material: '18/8 Stainless Steel',
    price: 52,
    capacity: '2.8 L Bin',
    highlightSpec: 'Odor-sealing silicone lid',
    weight: '960 g',
    rating: 4.8,
    reviews: 147,
    description:
      'Keeps fresh ice completely shielded from freezer odors with a magnetic nested stainless scoop inside the lid.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Bin + Scoop', priceDelta: 0 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Rapid-Freeze Gel Bottle Chill Sleeve',
    category: 'ice',
    variety: 'Chilling Accessories',
    material: 'BPA-Free Silicone / TPU',
    price: 24,
    capacity: 'Fits 750 ml – 1L',
    highlightSpec: 'Chills room water in 8 min',
    weight: '310 g',
    rating: 4.7,
    reviews: 132,
    description:
      'Store flat in the freezer and slip over glass carafes or mineral water bottles for instant icy table service.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Standard Sleeve', priceDelta: 0 },
      { label: 'Carafe Wide Sleeve', priceDelta: 4 },
    ],
    image: iceStudioImg,
  },
  {
    name: 'Vacuum-Sealed Botanical Water & Tonic Shaker',
    category: 'ice',
    variety: 'Water Glassware',
    material: '18/8 Stainless Steel',
    price: 54,
    capacity: '700 ml',
    highlightSpec: 'Integrated strainer cap',
    weight: '430 g',
    rating: 4.9,
    reviews: 158,
    description:
      'Double-wall insulated stainless shaker that flash-chills electrolyte mixes, matcha water, and botanical mocktails without freezing hands.',
    finishSet: 'alpine',
    sizes: [
      { label: '700 ml Shaker', priceDelta: 0 },
    ],
    image: iceStudioImg,
    tag: 'New',
  },
  {
    name: 'Architectural Pebble Ice Cube Micro-Tray',
    category: 'ice',
    variety: 'Ice Molds',
    material: 'BPA-Free Silicone / TPU',
    price: 19,
    capacity: '96 Mini Cubes',
    highlightSpec: 'Fast-release twist silicone',
    weight: '240 g',
    rating: 4.8,
    reviews: 215,
    description:
      'Creates satisfying bite-sized mini ice nuggets ideal for straw tumblers and rapid summer bottle refills.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Single Tray', priceDelta: 0 },
      { label: '2-Pack + Storage Bin', priceDelta: 20 },
    ],
    image: iceStudioImg,
  },

  // =========================================================================
  // 8. LIDS, STRAWS & CARE GEAR (13 products)
  // =========================================================================
  {
    name: 'Machined Leakproof Chug Lid',
    category: 'accessories',
    variety: 'Replacement Lids',
    material: '18/8 Stainless Steel',
    price: 16,
    capacity: 'Fits All Wide-Mouth',
    highlightSpec: 'Dual-thread fast flow',
    weight: '84 g',
    rating: 4.9,
    reviews: 348,
    description:
      'Signature Waterholic two-part chug cap with textured grip collar and integrated rigid carry handle.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Wide Mouth (58 mm)', priceDelta: 0 },
      { label: 'Standard Mouth (48 mm)', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
    tag: 'Bestseller',
  },
  {
    name: 'Protective Matte Silicone Bottle Boot',
    category: 'accessories',
    variety: 'Protective Boots',
    material: 'BPA-Free Silicone / TPU',
    price: 14,
    capacity: 'Fits 750 ml – 1.2 L',
    highlightSpec: 'Quiet desk-set & dent guard',
    weight: '56 g',
    rating: 4.9,
    reviews: 412,
    description:
      'Shock-absorbing food-grade silicone base sleeve protects powder-coated bottles against granite trails and noisy desks.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Small (500–750 ml)', priceDelta: 0 },
      { label: 'Medium (950 ml)', priceDelta: 0 },
      { label: 'Large (1.2–1.5 L)', priceDelta: 2 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Brushed Steel Reusable Straw 6-Pack',
    category: 'accessories',
    variety: 'Reusable Straws',
    material: '18/8 Stainless Steel',
    price: 18,
    capacity: '3 Straight + 3 Bent',
    highlightSpec: 'Silicone tips + brush',
    weight: '112 g',
    rating: 4.8,
    reviews: 267,
    description:
      'Smooth rounded-edge 18/8 steel straws compatible with 24 oz to 40 oz tumblers, packed in a linen roll with cleaning brush.',
    finishSet: 'mineral',
    sizes: [
      { label: '6-Pack Standard', priceDelta: 0 },
      { label: '6-Pack Extra Long (40 oz)', priceDelta: 3 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Woven Paracord Trail Carry Handle',
    category: 'accessories',
    variety: 'Carriers & Straps',
    material: 'BPA-Free Silicone / TPU',
    price: 15,
    capacity: 'Universal Neck Ring',
    highlightSpec: '550-grade alpine cord',
    weight: '48 g',
    rating: 4.8,
    reviews: 229,
    description:
      'Hand-braided 550 paracord wrist loop with safety security ring and anodized carabiner clip for hands-free hikes.',
    finishSet: 'trail',
    sizes: [
      { label: 'Wide Mouth Ring', priceDelta: 0 },
      { label: 'Standard Mouth Ring', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Long-Reach Natural Bamboo Bottle Brush',
    category: 'accessories',
    variety: 'Cleaning Care',
    material: 'Natural Mineral / Botanical',
    price: 14,
    capacity: '34 cm Handle',
    highlightSpec: 'Plant-fiber bristles',
    weight: '92 g',
    rating: 4.8,
    reviews: 198,
    description:
      'Scratch-free sisal and tampico bristles shaped to scrub deep corners of tall 1.2L flasks and glass carafes.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Single Brush', priceDelta: 0 },
      { label: 'Brush + Spare Head', priceDelta: 6 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Flip-Straw Insulated Sport Cap',
    category: 'accessories',
    variety: 'Replacement Lids',
    material: 'BPA-Free Silicone / TPU',
    price: 18,
    capacity: 'Includes 2 Cut-to-Fit Straws',
    highlightSpec: 'One-finger flip spout',
    weight: '92 g',
    rating: 4.8,
    reviews: 245,
    description:
      'Converts any wide-mouth Waterholic flask into an effortless single-hand sport bottle with leak-sealed pivot valve.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Wide Mouth', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Effervescent Bottle Cleaning Tablets (36-Pack)',
    category: 'accessories',
    variety: 'Cleaning Care',
    material: 'Natural Mineral / Botanical',
    price: 16,
    capacity: '36 Deep-Clean Tabs',
    highlightSpec: 'Zero-odor natural oxygen',
    weight: '185 g',
    rating: 4.9,
    reviews: 319,
    description:
      'Drop one tablet into warm water to lift mineral buildup, electrolyte residue, and tea stains from flasks and bladders.',
    finishSet: 'mineral',
    sizes: [
      { label: '36 Tablets', priceDelta: 0 },
      { label: '72 Tablets Value', priceDelta: 12 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Crossbody Ripstop Bottle Sling Carrier',
    category: 'accessories',
    variety: 'Carriers & Straps',
    material: 'BPA-Free Silicone / TPU',
    price: 34,
    capacity: 'Fits 750 ml – 1.2 L',
    highlightSpec: 'Phone + card zip pocket',
    weight: '148 g',
    rating: 4.9,
    reviews: 204,
    description:
      'Padded weather-resistant crossbody bottle sling with adjustable woven strap for walks, travel days, and city commutes.',
    finishSet: 'trail',
    sizes: [
      { label: 'Standard (750–950 ml)', priceDelta: 0 },
      { label: 'Large (1.2 L / 40 oz)', priceDelta: 4 },
    ],
    image: accessoriesStudioImg,
    tag: 'New',
  },
  {
    name: 'Wide-Mouth Hot & Cold Sip Lid',
    category: 'accessories',
    variety: 'Replacement Lids',
    material: 'BPA-Free Silicone / TPU',
    price: 17,
    capacity: 'Fits All Wide-Mouth',
    highlightSpec: '360° twist-to-open seal',
    weight: '78 g',
    rating: 4.7,
    reviews: 164,
    description:
      'Smooth drinking rim engineered for hot tea, morning coffee, or controlled icy sips without unscrewing the cap.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Wide Mouth', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Precision Straw, Lid & Gasket Brush Trio',
    category: 'accessories',
    variety: 'Cleaning Care',
    material: '18/8 Stainless Steel',
    price: 13,
    capacity: '3 Specialized Tools',
    highlightSpec: 'Reaches hidden O-rings',
    weight: '64 g',
    rating: 4.9,
    reviews: 187,
    description:
      'Includes an extra-long straw brush, angled lid-crevice scrubber, and silicone gasket pick on a neat storage ring.',
    finishSet: 'mineral',
    sizes: [
      { label: '3-Piece Kit', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Replacement Silicone O-Ring Gasket Pack',
    category: 'accessories',
    variety: 'Cleaning Care',
    material: 'BPA-Free Silicone / TPU',
    price: 10,
    capacity: '6 Universal Seals',
    highlightSpec: 'Restores factory seal',
    weight: '24 g',
    rating: 4.8,
    reviews: 142,
    description:
      'BPA-free medical-grade replacement lid gaskets keep years-old flasks performing 100% leakproof like day one.',
    finishSet: 'pure',
    sizes: [
      { label: 'Wide Mouth (6-Pack)', priceDelta: 0 },
      { label: 'Assorted Set (8-Pack)', priceDelta: 3 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Collapsible Travel Titanium Straw + Case',
    category: 'accessories',
    variety: 'Reusable Straws',
    material: 'Grade 1 Titanium',
    price: 24,
    capacity: 'Telescopes 10–23 cm',
    highlightSpec: 'Keychain-ready case',
    weight: '38 g',
    rating: 4.8,
    reviews: 136,
    description:
      'Telescoping Grade 1 titanium straw with micro-squeegee cleaner tucked inside a machined pocket tube.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Straw + Tube Case', priceDelta: 0 },
    ],
    image: accessoriesStudioImg,
  },
  {
    name: 'Anodized Alloy Trail Carabiner Clip Loop',
    category: 'accessories',
    variety: 'Carriers & Straps',
    material: '18/8 Stainless Steel',
    price: 12,
    capacity: '25 kg Static Hold',
    highlightSpec: 'Spring wire-gate lock',
    weight: '32 g',
    rating: 4.8,
    reviews: 174,
    description:
      'Featherweight matte anodized aluminum gear clip built to lash your Waterholic flask securely to daypacks and harnesses.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Single Clip', priceDelta: 0 },
      { label: '2-Pack Clips', priceDelta: 10 },
    ],
    image: accessoriesStudioImg,
  },

  // =========================================================================
  // 9. SIGNATURE UNIQUE BRANDED ADDITIONS (14 new unique products -> 120 total)
  // =========================================================================
  {
    name: 'Waterholic Pure Hammered Copper Wellness Bottle',
    category: 'bottles',
    variety: 'Ayurvedic Copper',
    material: 'Hand-Hammered Copper',
    price: 76,
    capacity: '900 ml',
    highlightSpec: '99.9% Pure Copper · Seamless',
    weight: '360 g',
    rating: 4.9,
    reviews: 1340,
    description:
      'Artisan hand-hammered pure copper hydration bottle with leakproof gasketed copper cap and central laser-engraved Waterholic emblem.',
    finishSet: 'mineral',
    sizes: [
      { label: '750 ml', priceDelta: -8 },
      { label: '900 ml', priceDelta: 0 },
      { label: '1.1 L', priceDelta: 12 },
    ],
    image: copperBottleImg,
    featured: true,
    tag: 'Artisan Copper',
  },
  {
    name: 'Waterholic SmartTemp LED Hydration Bottle',
    category: 'bottles',
    variety: 'Smart LED Bottle',
    material: '18/8 Stainless Steel',
    price: 68,
    capacity: '600 ml',
    highlightSpec: 'Touch LED °C cap · 24h cold',
    weight: '390 g',
    rating: 4.9,
    reviews: 1290,
    description:
      'Matte obsidian insulated bottle with touch-activated glacial-blue temperature ring in the lid and laser-etched Waterholic droplet logo.',
    finishSet: 'alpine',
    sizes: [
      { label: '500 ml', priceDelta: -6 },
      { label: '600 ml', priceDelta: 0 },
      { label: '750 ml', priceDelta: 8 },
    ],
    image: smartLedBottleImg,
    featured: true,
    tag: 'Smart Cap',
  },
  {
    name: 'Waterholic Botanical Lemon & Mint Glass Infuser',
    category: 'bottles',
    variety: 'Fruit Infuser Glass',
    material: 'Borosilicate Glass',
    price: 44,
    capacity: '750 ml',
    highlightSpec: 'Removable steel strainer',
    weight: '425 g',
    rating: 4.9,
    reviews: 1190,
    description:
      'Crystal-clear borosilicate glass bottle with fine-mesh stainless citrus & herb infuser basket, natural bamboo cap, and frosted Waterholic branding.',
    finishSet: 'pure',
    sizes: [
      { label: '600 ml', priceDelta: -4 },
      { label: '750 ml', priceDelta: 0 },
      { label: '1.0 L', priceDelta: 8 },
    ],
    image: infuserGlassImg,
    featured: true,
    tag: 'Fresh Infuse',
  },
  {
    name: 'Waterholic 2L Half-Gallon Expedition Thermal Jug',
    category: 'bottles',
    variety: 'Half-Gallon Jug',
    material: '18/8 Stainless Steel',
    price: 84,
    capacity: '2.0 L (64 oz)',
    highlightSpec: '48h ice · Steel bail handle',
    weight: '940 g',
    rating: 4.9,
    reviews: 1140,
    description:
      'Heavy-duty double-wall half-gallon thermal jug with knurled steel carry handle, tethered spout cap, and crisp white Waterholic mark.',
    finishSet: 'alpine',
    sizes: [
      { label: '1.9 L (64 oz)', priceDelta: 0 },
      { label: '3.8 L (1 Gal)', priceDelta: 34 },
    ],
    image: expeditionJugImg,
    featured: true,
    tag: '48h Ice',
  },
  {
    name: 'Waterholic Countertop 5L Gravity Glass Purifier',
    category: 'filters',
    variety: 'Countertop Dispenser',
    material: 'Borosilicate Glass',
    price: 168,
    capacity: '5.0 L Tank',
    highlightSpec: 'Dual carbon core · Steel tap',
    weight: '3.1 kg',
    rating: 5.0,
    reviews: 1040,
    description:
      'Architectural brushed-steel and borosilicate glass countertop water filter dispenser delivering crisp purified water for homes and dorm suites.',
    finishSet: 'pure',
    sizes: [
      { label: '5.0 L System', priceDelta: 0 },
      { label: '5.0 L + 4 Cartridges', priceDelta: 42 },
    ],
    image: countertopDispenserImg,
    featured: true,
    tag: 'Zero Plastic',
  },
  {
    name: 'Waterholic Sparkling Electrolyte Can 12-Pack',
    category: 'mineral',
    variety: 'Sparkling Electrolytes',
    material: 'Natural Mineral / Botanical',
    price: 34,
    capacity: '12 × 355 ml Cans',
    highlightSpec: '0g sugar · Mg + K + Sea Salt',
    weight: '4.6 kg',
    rating: 4.9,
    reviews: 995,
    description:
      'Crisp glacier-blue sparkling mineral water enhanced with balanced magnesium and potassium electrolytes in infinitely recyclable Waterholic cans.',
    finishSet: 'botanical',
    sizes: [
      { label: '12-Pack Cans', priceDelta: 0 },
      { label: '24-Pack Case', priceDelta: 28 },
    ],
    image: electrolyteCansImg,
    featured: true,
    tag: 'Zero Sugar',
  },
  {
    name: 'Waterholic Crystal Sphere Ice Bucket & Molds Set',
    category: 'ice',
    variety: 'Ice Bucket & Molds',
    material: '18/8 Stainless Steel',
    price: 72,
    capacity: '2.2 L Bucket + 4 Spheres',
    highlightSpec: 'Double-wall · No sweat ring',
    weight: '1.1 kg',
    rating: 4.9,
    reviews: 960,
    description:
      'Brushed double-wall stainless steel ice bucket laser-etched with the Waterholic emblem, paired with stainless tongs and clear 55 mm sphere molds.',
    finishSet: 'mineral',
    sizes: [
      { label: 'Bucket + 2 Molds', priceDelta: 0 },
      { label: 'Bucket + 4 Molds', priceDelta: 14 },
    ],
    image: iceStudioImg,
    featured: true,
    tag: 'Studio Barware',
  },
  {
    name: 'Waterholic Crossbody Neoprene Sling & Care Kit',
    category: 'accessories',
    variety: 'Sling & Care Bundle',
    material: 'BPA-Free Silicone / TPU',
    price: 42,
    capacity: 'Fits 750 ml – 1.2 L',
    highlightSpec: 'Phone pocket + Straws + Brush',
    weight: '280 g',
    rating: 4.9,
    reviews: 925,
    description:
      'Hands-free padded crossbody Waterholic bottle carrier with zippered phone pocket, matching silicone base boot, steel straws, and bamboo brush.',
    finishSet: 'alpine',
    sizes: [
      { label: 'Standard (750–950 ml)', priceDelta: 0 },
      { label: 'Large (1.2 L)', priceDelta: 4 },
    ],
    image: accessoriesStudioImg,
    featured: true,
    tag: 'Complete Kit',
  },
  {
    name: 'Waterholic Frosted Glass Ribbed Sleeve Bottle',
    category: 'bottles',
    variety: 'Silicone-Grip Glass',
    material: 'Borosilicate Glass',
    price: 38,
    capacity: '650 ml',
    highlightSpec: 'Tactile ribbed shock armor',
    weight: '410 g',
    rating: 4.8,
    reviews: 900,
    description:
      'Pure taste of frosted borosilicate glass shielded inside a ribbed soft-touch silicone grip sleeve printed with the crisp Waterholic logo.',
    finishSet: 'pure',
    sizes: [
      { label: '550 ml', priceDelta: -4 },
      { label: '650 ml', priceDelta: 0 },
      { label: '850 ml', priceDelta: 6 },
    ],
    image: siliconeSleeveBottleImg,
    featured: true,
    tag: 'Desk Favorite',
  },
  {
    name: 'Waterholic Artisan Stoneware Dining Pitcher',
    category: 'carafes',
    variety: 'Artisan Stoneware',
    material: 'Ceramic / Stoneware',
    price: 64,
    capacity: '1.6 L',
    highlightSpec: 'Kiln-fired matte glaze',
    weight: '980 g',
    rating: 4.9,
    reviews: 825,
    description:
      'Sculptural off-white ceramic dining pitcher stamped with the ocean-blue Waterholic droplet emblem to keep table water naturally cool.',
    finishSet: 'mineral',
    sizes: [
      { label: '1.6 L Pitcher', priceDelta: 0 },
      { label: 'Pitcher + 4 Tumblers', priceDelta: 48 },
    ],
    image: ceramicJugImg,
    featured: true,
    tag: 'Dining Series',
  },
  {
    name: 'Waterholic TrailSqueeze 0.1-Micron Microfilter',
    category: 'filters',
    variety: 'Squeeze Microfilter',
    material: 'BPA-Free Silicone / TPU',
    price: 56,
    capacity: '1.0 L Collapsible',
    highlightSpec: 'Filters 2,000 L · 99.9999%',
    weight: '92 g',
    rating: 4.9,
    reviews: 810,
    description:
      'Packable alpine squeeze filter pouch with hollow-fiber membrane that purifies mountain streams on the move and rolls flat into any vest pocket.',
    finishSet: 'trail',
    sizes: [
      { label: '1.0 L Filter Pouch', priceDelta: 0 },
      { label: '1.0 L + Spare Membrane', priceDelta: 24 },
    ],
    image: trailFilterImg,
    featured: true,
    tag: 'Backcountry',
  },
  {
    name: 'Waterholic 2.5L Insulated Alpine Bladder Reservoir',
    category: 'packs',
    variety: 'Insulated Bladder',
    material: 'BPA-Free Silicone / TPU',
    price: 54,
    capacity: '2.5 L Reservoir',
    highlightSpec: 'Wide slide-seal · Freeze-proof',
    weight: '205 g',
    rating: 4.9,
    reviews: 795,
    description:
      'Taste-free glacier-blue TPU hydration reservoir with insulated drink sleeve, leakproof magnetic bite valve, and bold Waterholic branding.',
    finishSet: 'trail',
    sizes: [
      { label: '2.0 L', priceDelta: -6 },
      { label: '2.5 L', priceDelta: 0 },
      { label: '3.0 L', priceDelta: 6 },
    ],
    image: hydrationBladderImg,
    featured: true,
    tag: 'Trail Ready',
  },
  {
    name: 'Waterholic Magnetic Phone-Mount Gym Bottle',
    category: 'bottles',
    variety: 'Mag-Mount Gym',
    material: '18/8 Stainless Steel',
    price: 58,
    capacity: '1.0 L',
    highlightSpec: 'MagSafe ring lid · Flip straw',
    weight: '540 g',
    rating: 4.8,
    reviews: 725,
    description:
      'Gym-engineered flip-straw bottle featuring an integrated magnetic phone mount in the carry loop for hands-free workout timers and form checks.',
    finishSet: 'alpine',
    sizes: [
      { label: '750 ml', priceDelta: -6 },
      { label: '1.0 L', priceDelta: 0 },
    ],
    image: bottleCampusGymLogoImg,
    featured: true,
    tag: 'Gym & Campus',
  },
  {
    name: 'Waterholic College Study Hall 1.5L Cold Flask',
    category: 'bottles',
    variety: 'Campus All-Day',
    material: '18/8 Stainless Steel',
    price: 54,
    capacity: '1.5 L',
    highlightSpec: 'Silent desk boot · 30h cold',
    weight: '610 g',
    rating: 4.9,
    reviews: 715,
    description:
      'Built for marathon finals weeks and back-to-back lectures — holds 1.5 L of ice water with zero condensation next to laptops and notebooks.',
    finishSet: 'alpine',
    sizes: [
      { label: '1.0 L', priceDelta: -6 },
      { label: '1.5 L', priceDelta: 0 },
    ],
    image: bottleCampusStudyLogoImg,
    featured: true,
    tag: 'Campus Pick',
  },
];

// Category-matched branded image pools so every category grid stays visually diverse
const CATEGORY_IMAGE_POOLS: Record<CategoryId, string[]> = {
  bottles: [
    pinkPremiumBottleImg,
    bottleStudioLogoImg,
    titaniumCanteenImg,
    copperBottleImg,
    smartLedBottleImg,
    infuserGlassImg,
    expeditionJugImg,
    siliconeSleeveBottleImg,
    bottleOutdoorLogoImg,
    bottleRiverLogoImg,
    bottleColdLogoImg,
    bottleHotLogoImg,
    bottleCampusStudyLogoImg,
    bottleCampusGymLogoImg,
  ],
  tumblers: [
    tumblerStudioImg,
    campMugImg,
    slimTumblerImg,
    steelPintImg,
    bottleCampusGymLogoImg,
    siliconeSleeveBottleImg,
    infuserGlassImg,
    expeditionJugImg,
  ],
  filters: [
    filterStudioImg,
    bottleCampusDormLogoImg,
    countertopDispenserImg,
    trailFilterImg,
    smartLedBottleImg,
    carafeStudioImg,
  ],
  carafes: [
    carafeStudioImg,
    ceramicJugImg,
    countertopDispenserImg,
    bottleCampusDormLogoImg,
    infuserGlassImg,
    copperBottleImg,
  ],
  packs: [
    packStudioImg,
    hydrationBladderImg,
    trailFilterImg,
    bottleOutdoorLogoImg,
    accessoriesStudioImg,
  ],
  mineral: [
    mineralStudioImg,
    electrolyteCansImg,
    infuserGlassImg,
    carafeStudioImg,
    steelPintImg,
  ],
  ice: [
    iceStudioImg,
    steelPintImg,
    bottleColdLogoImg,
    carafeStudioImg,
    electrolyteCansImg,
  ],
  accessories: [
    accessoriesStudioImg,
    bottleStudioLogoImg,
    siliconeSleeveBottleImg,
    campMugImg,
    packStudioImg,
  ],
};

const categoryCounters: Record<CategoryId, number> = {
  bottles: 0,
  tumblers: 0,
  filters: 0,
  carafes: 0,
  packs: 0,
  mineral: 0,
  ice: 0,
  accessories: 0,
};

const SINGLE_GENERIC_DEFAULTS = new Set<string>([
  tumblerStudioImg,
  filterStudioImg,
  carafeStudioImg,
  packStudioImg,
  mineralStudioImg,
  iceStudioImg,
  accessoriesStudioImg,
]);

export const PRODUCTS: Product[] = RAW_SEEDS.map((seed, index) => {
  const num = String(index + 1).padStart(3, '0');
  const catCode = seed.category.slice(0, 3).toUpperCase();
  const catIdx = categoryCounters[seed.category];
  categoryCounters[seed.category] += 1;

  // Keep hand-curated featured / newly added unique photos intact, while diversifying older non-featured items that shared one generic category photo
  const pool = CATEGORY_IMAGE_POOLS[seed.category];
  const resolvedImage =
    !seed.featured &&
    index < 106 &&
    SINGLE_GENERIC_DEFAULTS.has(seed.image) &&
    pool.length > 1
      ? pool[catIdx % pool.length]
      : seed.image;

  return {
    id: `wh-${num}`,
    sku: `WH-${catCode}-${num}`,
    name: seed.name,
    category: seed.category,
    variety: seed.variety,
    material: seed.material,
    price: seed.price,
    capacity: seed.capacity,
    highlightSpec: seed.highlightSpec,
    weight: seed.weight,
    rating: seed.rating,
    reviews: seed.reviews,
    description: seed.description,
    finishes: FINISH_SETS[seed.finishSet],
    sizes: seed.sizes,
    image: resolvedImage,
    imageFocus: seed.imageFocus,
    featured: seed.featured,
    tag: seed.tag,
  };
});

export const MATERIALS_LIST: string[] = Array.from(
  new Set(PRODUCTS.map((p) => p.material))
).sort();
