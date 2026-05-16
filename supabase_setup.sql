-- =============================================================================
-- VIVA INTERIORS & FURNITURE REPAIRS — Full Supabase setup
-- Project: ehahxyrrzmgskffyyzzp
-- URL:     https://ehahxyrrzmgskffyyzzp.supabase.co
--
-- Run this entire script in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS where needed.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT 'fa-solid fa-folder',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  price               DECIMAL(12,2) NOT NULL DEFAULT 0,
  old_price           DECIMAL(12,2),
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  image               TEXT,
  image_url           TEXT,
  images              TEXT[],
  tags                TEXT[],
  in_stock            BOOLEAN NOT NULL DEFAULT true,
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  delivery_days       INTEGER NOT NULL DEFAULT 3,
  installation_guide  BOOLEAN NOT NULL DEFAULT false,
  featured            BOOLEAN NOT NULL DEFAULT false,
  coming_soon         BOOLEAN NOT NULL DEFAULT false,
  badge               TEXT,
  rating              DECIMAL(3,2) DEFAULT 4.5,
  reviews             INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT DEFAULT '0741968635',
  whatsapp        TEXT DEFAULT '254741968635',
  email           TEXT,
  address         TEXT,
  facebook_url    TEXT,
  instagram_url   TEXT,
  twitter_url     TEXT,
  tiktok_url      TEXT,
  business_hours  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS about_us (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagline            TEXT,
  description        TEXT,
  years_in_business  INTEGER,
  mission            TEXT,
  vision             TEXT,
  values             TEXT[],
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns added on existing projects
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 4.5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0;

-- Unique slug (after backfill below)
-- ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);

-- =============================================================================
-- 2. UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS about_us_updated_at ON about_us;
CREATE TRIGGER about_us_updated_at
  BEFORE UPDATE ON about_us
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Keep image_url in sync when only image is set
CREATE OR REPLACE FUNCTION public.sync_product_image_url()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.image_url IS NULL OR NEW.image_url = '')
     AND NEW.image IS NOT NULL
     AND NEW.image <> '' THEN
    NEW.image_url := NEW.image;
  END IF;
  IF (NEW.image IS NULL OR NEW.image = '')
     AND NEW.image_url IS NOT NULL
     AND NEW.image_url <> '' THEN
    NEW.image := NEW.image_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_image_url ON products;
CREATE TRIGGER products_sync_image_url
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_image_url();

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_coming_soon ON products(coming_soon);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_us ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Categories
DROP POLICY IF EXISTS "categories_select_public" ON categories;
CREATE POLICY "categories_select_public" ON categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_authenticated" ON categories;
CREATE POLICY "categories_insert_authenticated" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "categories_update_authenticated" ON categories;
CREATE POLICY "categories_update_authenticated" ON categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_delete_authenticated" ON categories;
CREATE POLICY "categories_delete_authenticated" ON categories
  FOR DELETE TO authenticated USING (true);

-- Products
DROP POLICY IF EXISTS "products_select_public" ON products;
CREATE POLICY "products_select_public" ON products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "products_insert_authenticated" ON products;
CREATE POLICY "products_insert_authenticated" ON products
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "products_update_authenticated" ON products;
CREATE POLICY "products_update_authenticated" ON products
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products_delete_authenticated" ON products;
CREATE POLICY "products_delete_authenticated" ON products
  FOR DELETE TO authenticated USING (true);

-- Contacts
DROP POLICY IF EXISTS "contacts_select_public" ON contacts;
CREATE POLICY "contacts_select_public" ON contacts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "contacts_insert_authenticated" ON contacts;
CREATE POLICY "contacts_insert_authenticated" ON contacts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contacts_update_authenticated" ON contacts;
CREATE POLICY "contacts_update_authenticated" ON contacts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- About us
DROP POLICY IF EXISTS "about_us_select_public" ON about_us;
CREATE POLICY "about_us_select_public" ON about_us
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "about_us_insert_authenticated" ON about_us;
CREATE POLICY "about_us_insert_authenticated" ON about_us
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "about_us_update_authenticated" ON about_us;
CREATE POLICY "about_us_update_authenticated" ON about_us
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Admin users (no public read)
DROP POLICY IF EXISTS "admin_users_select_authenticated" ON admin_users;
CREATE POLICY "admin_users_select_authenticated" ON admin_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_users_insert_authenticated" ON admin_users;
CREATE POLICY "admin_users_insert_authenticated" ON admin_users
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_users_update_authenticated" ON admin_users;
CREATE POLICY "admin_users_update_authenticated" ON admin_users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- 5. STORAGE BUCKET (product-images, public read)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_auth_upload" ON storage.objects;
CREATE POLICY "product_images_auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_auth_update" ON storage.objects;
CREATE POLICY "product_images_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_auth_delete" ON storage.objects;
CREATE POLICY "product_images_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- =============================================================================
-- 6. SEED — CATEGORIES (slugs match js/data.js CATEGORIES ids)
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON categories(slug);

INSERT INTO categories (slug, name, icon, sort_order) VALUES
  ('living',  'Living Room',      'fa-solid fa-couch',                 1),
  ('bedroom', 'Bedroom',          'fa-solid fa-bed',                   2),
  ('dining',  'Dining',           'fa-solid fa-utensils',              3),
  ('office',  'Office',           'fa-solid fa-chair',                 4),
  ('outdoor', 'Outdoor',          'fa-solid fa-tree',                  5),
  ('repairs', 'Repairs & Custom', 'fa-solid fa-screwdriver-wrench',    6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Backfill slug on legacy rows (name-only categories)
UPDATE categories SET slug = 'living'  WHERE slug IS NULL AND name ILIKE '%living%';
UPDATE categories SET slug = 'bedroom' WHERE slug IS NULL AND name ILIKE '%bedroom%';
UPDATE categories SET slug = 'dining'  WHERE slug IS NULL AND name ILIKE '%dining%';
UPDATE categories SET slug = 'office'  WHERE slug IS NULL AND name ILIKE '%office%';
UPDATE categories SET slug = 'outdoor' WHERE slug IS NULL AND name ILIKE '%outdoor%';
UPDATE categories SET slug = 'repairs' WHERE slug IS NULL AND name ILIKE '%repair%';

-- =============================================================================
-- 7. SEED — CONTACTS & ABOUT
-- =============================================================================

INSERT INTO contacts (phone, whatsapp, address, business_hours)
SELECT
  '0741968635',
  '254741968635',
  'Waithaka, Karen & Kikuyu, Nairobi, Kenya',
  'Mon–Sat: 8:00 AM – 7:00 PM'
WHERE NOT EXISTS (SELECT 1 FROM contacts LIMIT 1);

INSERT INTO about_us (tagline, description, years_in_business, mission, vision, values)
SELECT
  'Interiors & Furniture Repairs · Kenya',
  'VIVA INTERIORS & FURNITURE REPAIRS brings quality furniture and skilled craftsmanship to Nairobi. From living room sofas and bedroom sets to dining tables and office desks — we help you furnish your space beautifully. Our repair team, led by Joshua, restores and re-upholsters your favourite pieces. Visit us in Waithaka, Karen, or Kikuyu.',
  5,
  'To furnish Kenyan homes with quality furniture and expert repair services.',
  'To be Nairobi''s trusted name for interiors and furniture restoration.',
  ARRAY['Quality', 'Craftsmanship', 'Integrity', 'Customer Satisfaction']
WHERE NOT EXISTS (SELECT 1 FROM about_us LIMIT 1);

-- =============================================================================
-- 8. SEED — PRODUCTS (Pexels CDN URLs; image + image_url both set)
-- =============================================================================

-- Clear catalog only when re-seeding (comment out if you have custom products)
-- TRUNCATE products RESTART IDENTITY CASCADE;

DELETE FROM products WHERE name IN (
  'L-Shaped Fabric Sofa — 5 Seater, Grey',
  'Modern Coffee Table — Solid Wood & Glass',
  'Queen Size Bed Frame — Upholstered Headboard',
  '6-Door Wardrobe — Mirror & Hanging Rails',
  'Dining Set — 6 Chairs & Extendable Table',
  'Bar Stools — Set of 2, Leather Seat',
  'Executive Office Desk — Drawers & Cable Management',
  'Ergonomic Office Chair — Mesh Back, Adjustable',
  'Outdoor Patio Set — Table + 4 Chairs',
  'TV Stand — 55" with Storage Cabinets',
  'Bookshelf — 5-Tier Open Display',
  'Sofa Re-Upholstery — Per Seat (Labour + Material)',
  'Furniture Repair — Chairs, Tables & Cabinets',
  'Custom Built-In Wardrobe — Per Metre',
  'Accent Armchair — Velvet, Emerald Green',
  'Bedside Tables — Pair, 2 Drawers Each'
);

INSERT INTO products (
  name, description, price, old_price, category_id,
  image, image_url, tags, in_stock, delivery_days, badge, coming_soon, rating, reviews, featured
)
SELECT
  v.name, v.description, v.price, v.old_price, c.id,
  v.image_url, v.image_url, v.tags, v.in_stock, v.delivery_days, v.badge, v.coming_soon, v.rating, v.reviews, v.featured
FROM (VALUES
  (
    'L-Shaped Fabric Sofa — 5 Seater, Grey',
    'Spacious L-shaped sofa with high-density foam cushions and durable fabric upholstery. Perfect for family living rooms. Delivery and setup available across Nairobi.',
    85000::DECIMAL, 98000::DECIMAL, 'living',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['sofa','living room','fabric','grey'], true, 3, 'sale', false, 4.7, 42, true
  ),
  (
    'Modern Coffee Table — Solid Wood & Glass',
    'Elegant coffee table combining solid oak legs with tempered glass top. Easy to clean, sturdy, and complements modern and classic interiors.',
    18500, 22000, 'living',
    'https://images.pexels.com/photos/276534/pexels-photo-276534.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['coffee table','wood','glass','living room'], true, 2, 'best', false, 4.8, 31, true
  ),
  (
    'Queen Size Bed Frame — Upholstered Headboard',
    'Stylish queen bed with padded headboard, slatted base, and reinforced frame. Available in charcoal, beige, and navy. Mattress sold separately.',
    62000, 75000, 'bedroom',
    'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['bed','bedroom','queen','upholstered'], true, 3, 'hot', false, 4.6, 28, false
  ),
  (
    '6-Door Wardrobe — Mirror & Hanging Rails',
    'Spacious wardrobe with mirrored doors, shelves, and hanging sections. Ideal for master bedrooms. Professional assembly included.',
    95000, 110000, 'bedroom',
    'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['wardrobe','bedroom','storage','mirror'], true, 4, 'sale', false, 4.5, 19, false
  ),
  (
    'Dining Set — 6 Chairs & Extendable Table',
    'Solid wood dining table with extension leaf seats six comfortably. Matching upholstered chairs with ergonomic backs.',
    78000, 92000, 'dining',
    'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['dining','table','chairs','wood'], true, 3, 'best', false, 4.7, 24, true
  ),
  (
    'Bar Stools — Set of 2, Leather Seat',
    'Counter-height bar stools with swivel seats and footrests. PU leather upholstery, steel legs with powder-coated finish.',
    12000, 15000, 'dining',
    'https://images.pexels.com/photos/4621977/pexels-photo-4621977.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['bar stool','dining','kitchen'], true, 2, 'sale', false, 4.4, 15, false
  ),
  (
    'Executive Office Desk — Drawers & Cable Management',
    'Professional desk with file drawers, keyboard tray, and built-in cable ports. Walnut finish. Perfect for home offices and studies.',
    45000, 52000, 'office',
    'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['desk','office','work from home'], true, 2, 'new', false, 4.6, 18, false
  ),
  (
    'Ergonomic Office Chair — Mesh Back, Adjustable',
    'Breathable mesh back, lumbar support, height and tilt adjustment. Smooth-rolling casters for carpet and tile floors.',
    22000, 28000, 'office',
    'https://images.pexels.com/photos/1181533/pexels-photo-1181533.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['chair','office','ergonomic'], true, 1, 'hot', false, 4.8, 36, true
  ),
  (
    'Outdoor Patio Set — Table + 4 Chairs',
    'Weather-resistant rattan-style patio set for balconies and gardens. Cushions included. Easy to maintain.',
    55000, 65000, 'outdoor',
    'https://images.pexels.com/photos/2765834/pexels-photo-2765834.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['outdoor','patio','garden','rattan'], true, 3, 'sale', false, 4.5, 12, false
  ),
  (
    'TV Stand — 55" with Storage Cabinets',
    'Low-profile TV unit with open shelf and closed cabinets. Cable holes, stable base, fits TVs up to 55 inches.',
    28000, 34000, 'living',
    'https://images.pexels.com/photos/7319274/pexels-photo-7319274.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['tv stand','living room','storage'], true, 2, NULL, false, 4.4, 9, false
  ),
  (
    'Bookshelf — 5-Tier Open Display',
    'Versatile shelving unit for books, décor, and office supplies. Sturdy particle board with laminate finish.',
    16500, 20000, 'office',
    'https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['bookshelf','storage','office'], true, 2, 'sale', false, 4.3, 11, false
  ),
  (
    'Sofa Re-Upholstery — Per Seat (Labour + Material)',
    'Bring your sofa back to life. Fabric or leather re-upholstery per seat. Free assessment at Waithaka, Karen, or Kikuyu. Led by our repair team.',
    8500, NULL, 'repairs',
    'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['repair','upholstery','sofa','custom'], true, 7, 'best', false, 4.9, 58, true
  ),
  (
    'Furniture Repair — Chairs, Tables & Cabinets',
    'Expert repair for broken legs, loose joints, drawer runners, and surface damage. Quote after inspection — contact Joshua''s team on WhatsApp.',
    3500, NULL, 'repairs',
    'https://images.pexels.com/photos/1080696/pexels-photo-1080696.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['repair','restoration','wood'], true, 5, 'hot', false, 4.8, 44, true
  ),
  (
    'Custom Built-In Wardrobe — Per Metre',
    'Made-to-measure built-in wardrobes tailored to your space. Design consultation, manufacture, and installation by VIVA Interiors.',
    18000, NULL, 'repairs',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['custom','wardrobe','built-in'], true, 14, 'new', true, 4.5, 0, false
  ),
  (
    'Accent Armchair — Velvet, Emerald Green',
    'Statement armchair with velvet upholstery and gold-finish legs. Adds colour and comfort to any corner or reading nook.',
    32000, 38000, 'living',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['armchair','velvet','accent','living room'], true, 2, 'sale', true, 4.2, 0, false
  ),
  (
    'Bedside Tables — Pair, 2 Drawers Each',
    'Matching pair of bedside tables with soft-close drawers. Compact design suits most bedrooms.',
    14000, 17000, 'bedroom',
    'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    ARRAY['bedside','nightstand','bedroom'], true, 2, 'sale', true, 4.1, 0, false
  )
) AS v(
  name, description, price, old_price, category_slug,
  image_url, tags, in_stock, delivery_days, badge, coming_soon, rating, reviews, featured
)
JOIN categories c ON c.slug = v.category_slug;

-- Ensure image_url populated everywhere
UPDATE products
SET image_url = image
WHERE (image_url IS NULL OR image_url = '')
  AND image IS NOT NULL AND image <> '';

UPDATE products
SET image = image_url
WHERE (image IS NULL OR image = '')
  AND image_url IS NOT NULL AND image_url <> '';

-- =============================================================================
-- 9. HELPER VIEW (optional — products with category slug for the storefront)
-- =============================================================================

CREATE OR REPLACE VIEW public.products_with_category AS
SELECT
  p.*,
  c.slug AS category_slug,
  c.name AS category_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id;

GRANT SELECT ON public.products_with_category TO anon, authenticated;

-- =============================================================================
-- 10. VERIFY (results appear in Supabase SQL output)
-- =============================================================================

SELECT 'categories' AS table_name, COUNT(*)::INT AS row_count FROM categories
UNION ALL SELECT 'products', COUNT(*)::INT FROM products
UNION ALL SELECT 'contacts', COUNT(*)::INT FROM contacts
UNION ALL SELECT 'about_us', COUNT(*)::INT FROM about_us;

SELECT p.name, c.slug AS category, p.image_url, p.coming_soon
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
ORDER BY p.created_at;

-- =============================================================================
-- DONE — VIVA INTERIORS Supabase setup complete
-- =============================================================================
