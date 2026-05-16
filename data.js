/* ============================================================
   VIVA INTERIORS & FURNITURE REPAIRS — data.js
   ============================================================ */

const CONFIG = {
  waNumber: "254741968635",
  phoneNumber: "0741968635",
  storeName: "VIVA INTERIORS & FURNITURE REPAIRS",
  storeShort: "VIVA Interiors",
  teamLeader: "Joshua",
  locations: "Waithaka, Karen & Kikuyu",
  currency: "KSh",
  socialMedia: {
    whatsapp: "https://wa.me/254741968635",
  },
  supabaseUrl: "https://ehahxyrrzmgskffyyzzp.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYWh4eXJyem1nc2tmZnl5enpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTM3NjgsImV4cCI6MjA5NDUyOTc2OH0.WU_HR6OaBv1xqnQRmDHILwsut53pSIg4cAogNAXE84k",
};

if (typeof window !== "undefined" && window.VIVA_CONFIG) {
  Object.assign(CONFIG, window.VIVA_CONFIG);
}

/** Reliable CDN images (Pexels) — works when opening file locally */
function pexels(id, w = 600, h = null) {
  let url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
  if (h) url += `&h=${h}&fit=crop`;
  return url;
}

const IMG_FALLBACK = pexels(1571460, 600, 400);

/** Normalize product image URLs (absolute, Supabase storage, or fallback). */
function resolveProductImageUrl(raw) {
  if (!raw || typeof raw !== "string") return IMG_FALLBACK;
  const trimmed = raw.trim();
  if (!trimmed) return IMG_FALLBACK;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = (CONFIG.supabaseUrl || "").replace(/\/$/, "");
  if (!base) return IMG_FALLBACK;
  const path = trimmed.replace(/^\//, "");
  if (path.startsWith("storage/v1/")) return `${base}/${path}`;
  return `${base}/storage/v1/object/public/${path}`;
}

function productImageFromRow(row) {
  const raw =
    row?.image_url ||
    row?.image ||
    (Array.isArray(row?.images) && row.images[0]) ||
    "";
  return resolveProductImageUrl(raw);
}

function mapDbProduct(row) {
  let cat =
    row.category_slug ||
    (row.categories && row.categories.slug) ||
    row.category ||
    (row.categories && row.categories.name) ||
    "";
  if (!cat && row.category_id) {
    cat = String(row.category_id);
  }
  const categorySlug = String(cat).toLowerCase().replace(/\s+/g, "-");
  return {
    id: row.id,
    name: row.name,
    category: categorySlug,
    price: Number(row.price) || 0,
    oldPrice: row.old_price,
    badge: row.badge,
    image: productImageFromRow(row),
    description: row.description,
    tags: row.tags || [],
    inStock: row.in_stock !== false,
    deliveryDays: row.delivery_days,
    comingSoon: !!row.coming_soon,
  };
}

const SITE_IMAGES = {
  splash: [
    pexels(1571460, 120, 90),
    pexels(1866149, 140, 105),
    pexels(1080721, 180, 130),
    pexels(1454806, 140, 105),
    pexels(276534, 120, 90),
  ],
  hero: {
    main: pexels(1571460, 560, 400),
    left: pexels(1080721, 280, 210),
    right: pexels(1454806, 260, 196),
    mini: pexels(276534, 200, 150),
  },
};

const CATEGORIES = [
  { id: "all",         label: "All Products",       icon: "fa-solid fa-border-all" },
  { id: "living",      label: "Living Room",        icon: "fa-solid fa-couch" },
  { id: "bedroom",     label: "Bedroom",            icon: "fa-solid fa-bed" },
  { id: "dining",      label: "Dining",             icon: "fa-solid fa-utensils" },
  { id: "office",      label: "Office",             icon: "fa-solid fa-chair" },
  { id: "outdoor",     label: "Outdoor",            icon: "fa-solid fa-tree" },
  { id: "repairs",     label: "Repairs & Custom",   icon: "fa-solid fa-screwdriver-wrench" },
];

let PRODUCTS = [
  {
    id: 1,
    name: "L-Shaped Fabric Sofa — 5 Seater, Grey",
    category: "living",
    price: 85000,
    oldPrice: 98000,
    badge: "sale",
    image: pexels(1571460, 600, 400),
    description: "Spacious L-shaped sofa with high-density foam cushions and durable fabric upholstery. Perfect for family living rooms. Delivery and setup available across Nairobi.",
    tags: ["sofa", "living room", "fabric", "grey"],
    inStock: true,
    deliveryDays: 3,
  },
  {
    id: 2,
    name: "Modern Coffee Table — Solid Wood & Glass",
    category: "living",
    price: 18500,
    oldPrice: 22000,
    badge: "best",
    image: pexels(276534, 600, 400),
    description: "Elegant coffee table combining solid oak legs with tempered glass top. Easy to clean, sturdy, and complements modern and classic interiors.",
    tags: ["coffee table", "wood", "glass", "living room"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 3,
    name: "Queen Size Bed Frame — Upholstered Headboard",
    category: "bedroom",
    price: 62000,
    oldPrice: 75000,
    badge: "hot",
    image: pexels(1454806, 600, 400),
    description: "Stylish queen bed with padded headboard, slatted base, and reinforced frame. Available in charcoal, beige, and navy. Mattress sold separately.",
    tags: ["bed", "bedroom", "queen", "upholstered"],
    inStock: true,
    deliveryDays: 3,
  },
  {
    id: 4,
    name: "6-Door Wardrobe — Mirror & Hanging Rails",
    category: "bedroom",
    price: 95000,
    oldPrice: 110000,
    badge: "sale",
    image: pexels(667838, 600, 400),
    description: "Spacious wardrobe with mirrored doors, shelves, and hanging sections. Ideal for master bedrooms. Professional assembly included.",
    tags: ["wardrobe", "bedroom", "storage", "mirror"],
    inStock: true,
    deliveryDays: 4,
  },
  {
    id: 5,
    name: "Dining Set — 6 Chairs & Extendable Table",
    category: "dining",
    price: 78000,
    oldPrice: 92000,
    badge: "best",
    image: pexels(1080721, 600, 400),
    description: "Solid wood dining table with extension leaf seats six comfortably. Matching upholstered chairs with ergonomic backs.",
    tags: ["dining", "table", "chairs", "wood"],
    inStock: true,
    deliveryDays: 3,
  },
  {
    id: 6,
    name: "Bar Stools — Set of 2, Leather Seat",
    category: "dining",
    price: 12000,
    oldPrice: 15000,
    badge: "sale",
    image: pexels(4621977, 600, 400),
    description: "Counter-height bar stools with swivel seats and footrests. PU leather upholstery, steel legs with powder-coated finish.",
    tags: ["bar stool", "dining", "kitchen"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 7,
    name: "Executive Office Desk — Drawers & Cable Management",
    category: "office",
    price: 45000,
    oldPrice: 52000,
    badge: "new",
    image: pexels(7688336, 600, 400),
    description: "Professional desk with file drawers, keyboard tray, and built-in cable ports. Walnut finish. Perfect for home offices and studies.",
    tags: ["desk", "office", "work from home"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 8,
    name: "Ergonomic Office Chair — Mesh Back, Adjustable",
    category: "office",
    price: 22000,
    oldPrice: 28000,
    badge: "hot",
    image: pexels(1181533, 600, 400),
    description: "Breathable mesh back, lumbar support, height and tilt adjustment. Smooth-rolling casters for carpet and tile floors.",
    tags: ["chair", "office", "ergonomic"],
    inStock: true,
    deliveryDays: 1,
  },
  {
    id: 9,
    name: "Outdoor Patio Set — Table + 4 Chairs",
    category: "outdoor",
    price: 55000,
    oldPrice: 65000,
    badge: "sale",
    image: pexels(2765834, 600, 400),
    description: "Weather-resistant rattan-style patio set for balconies and gardens. Cushions included. Easy to maintain.",
    tags: ["outdoor", "patio", "garden", "rattan"],
    inStock: true,
    deliveryDays: 3,
  },
  {
    id: 10,
    name: "TV Stand — 55\" with Storage Cabinets",
    category: "living",
    price: 28000,
    oldPrice: 34000,
    badge: null,
    image: pexels(7319274, 600, 400),
    description: "Low-profile TV unit with open shelf and closed cabinets. Cable holes, stable base, fits TVs up to 55 inches.",
    tags: ["tv stand", "living room", "storage"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 11,
    name: "Bookshelf — 5-Tier Open Display",
    category: "office",
    price: 16500,
    oldPrice: 20000,
    badge: "sale",
    image: pexels(1571453, 600, 400),
    description: "Versatile shelving unit for books, décor, and office supplies. Sturdy particle board with laminate finish.",
    tags: ["bookshelf", "storage", "office"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 12,
    name: "Sofa Re-Upholstery — Per Seat (Labour + Material)",
    category: "repairs",
    price: 8500,
    oldPrice: null,
    badge: "best",
    image: pexels(1571468, 600, 400),
    description: "Bring your sofa back to life. Fabric or leather re-upholstery per seat. Free assessment at Waithaka, Karen, or Kikuyu. Led by our repair team.",
    tags: ["repair", "upholstery", "sofa", "custom"],
    inStock: true,
    deliveryDays: 7,
  },
  {
    id: 13,
    name: "Furniture Repair — Chairs, Tables & Cabinets",
    category: "repairs",
    price: 3500,
    oldPrice: null,
    badge: "hot",
    image: pexels(1080696, 600, 400),
    description: "Expert repair for broken legs, loose joints, drawer runners, and surface damage. Quote after inspection — contact Joshua's team on WhatsApp.",
    tags: ["repair", "restoration", "wood"],
    inStock: true,
    deliveryDays: 5,
  },
  {
    id: 14,
    name: "Custom Built-In Wardrobe — Per Metre",
    category: "repairs",
    price: 18000,
    oldPrice: null,
    badge: "new",
    comingSoon: true,
    description: "Made-to-measure built-in wardrobes tailored to your space. Design consultation, manufacture, and installation by VIVA Interiors.",
    tags: ["custom", "wardrobe", "built-in"],
    inStock: true,
    deliveryDays: 14,
  },
  {
    id: 15,
    name: "Accent Armchair — Velvet, Emerald Green",
    category: "living",
    price: 32000,
    oldPrice: 38000,
    badge: "sale",
    comingSoon: true,
    description: "Statement armchair with velvet upholstery and gold-finish legs. Adds colour and comfort to any corner or reading nook.",
    tags: ["armchair", "velvet", "accent", "living room"],
    inStock: true,
    deliveryDays: 2,
  },
  {
    id: 16,
    name: "Bedside Tables — Pair, 2 Drawers Each",
    category: "bedroom",
    price: 14000,
    oldPrice: 17000,
    badge: "sale",
    comingSoon: true,
    description: "Matching pair of bedside tables with soft-close drawers. Compact design suits most bedrooms.",
    tags: ["bedside", "nightstand", "bedroom"],
    inStock: true,
    deliveryDays: 2,
  },
];

function sortProductsList(list) {
  const available = list.filter((p) => !p.comingSoon);
  const soon = list.filter((p) => p.comingSoon);
  return [...available, ...soon];
}

function getDiscountPercentage(oldPrice, price) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
