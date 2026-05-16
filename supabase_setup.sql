-- ========================================
-- SUPABASE DATABASE SETUP FOR PRO LAPTOPS
-- ========================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'fa-solid fa-folder',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    old_price DECIMAL(10,2),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image TEXT,
    image_url TEXT,
    images TEXT[], -- Array of image URLs
    tags TEXT[], -- Array of tags
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    delivery_days INTEGER DEFAULT 3,
    installation_guide BOOLEAN DEFAULT false,
    featured BOOLEAN DEFAULT false,
    badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADMIN USERS TABLE (assuming it exists, adding any missing columns)
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT DEFAULT '0741968635',
    whatsapp TEXT DEFAULT '254741968635',
    email TEXT,
    address TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    tiktok_url TEXT,
    business_hours TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ABOUT US TABLE
CREATE TABLE IF NOT EXISTS about_us (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tagline TEXT,
    description TEXT,
    years_in_business INTEGER,
    mission TEXT,
    vision TEXT,
    values TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_us ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, admin write
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);
CREATE POLICY "Categories can be created by admins" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "Categories can be updated by admins" ON categories
    FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "Categories can be deleted by admins" ON categories
    FOR DELETE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));

-- Products: Public read, admin write
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);
CREATE POLICY "Products can be created by admins" ON products
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "Products can be updated by admins" ON products
    FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "Products can be deleted by admins" ON products
    FOR DELETE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));

-- Contacts: Public read, admin write
CREATE POLICY "Contacts are viewable by everyone" ON contacts
    FOR SELECT USING (true);
CREATE POLICY "Contacts can be created by admins" ON contacts
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "Contacts can be updated by admins" ON contacts
    FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));

-- About Us: Public read, admin write
CREATE POLICY "About Us is viewable by everyone" ON about_us
    FOR SELECT USING (true);
CREATE POLICY "About Us can be created by admins" ON about_us
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));
CREATE POLICY "About Us can be updated by admins" ON about_us
    FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM admin_users WHERE admin_users.email = auth.email()
    ));

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 8. TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers first, then recreate them
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
DROP TRIGGER IF EXISTS products_updated_at ON products;
DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS about_us_updated_at ON about_us;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER about_us_updated_at BEFORE UPDATE ON about_us
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 9. INSERT DEFAULT DATA (only if tables are empty)
INSERT INTO categories (name, icon) 
SELECT 'Living Room', 'fa-solid fa-couch' 
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

INSERT INTO categories (name, icon) 
SELECT 'Bedroom', 'fa-solid fa-bed' 
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Bedroom');

INSERT INTO categories (name, icon) 
SELECT 'Dining', 'fa-solid fa-utensils' 
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Dining');

INSERT INTO categories (name, icon) 
SELECT 'Repairs & Custom', 'fa-solid fa-screwdriver-wrench' 
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Repairs & Custom');

-- Default contacts (only if empty)
INSERT INTO contacts (phone, whatsapp, business_hours)
SELECT '0741968635', '254741968635', 'Mon-Sat: 8AM-7PM'
WHERE NOT EXISTS (SELECT 1 FROM contacts LIMIT 1);

-- Default About Us (only if empty)
INSERT INTO about_us (tagline, description, years_in_business, mission, vision, values)
SELECT 
    'Interiors & Furniture Repairs · Kenya',
    'VIVA INTERIORS & FURNITURE REPAIRS brings quality furniture and skilled craftsmanship to Nairobi. Visit us in Waithaka, Karen, or Kikuyu. Team led by Joshua.',
    5,
    'To furnish Kenyan homes with quality furniture and expert repair services.',
    'To be Nairobi''s trusted name for interiors and furniture restoration.',
    ARRAY['Quality', 'Craftsmanship', 'Integrity', 'Customer Satisfaction']
WHERE NOT EXISTS (SELECT 1 FROM about_us LIMIT 1);

-- 10. STORAGE BUCKET FOR PRODUCT IMAGES
-- Run this in Supabase Dashboard:
-- Create storage bucket named "product-images" with public access

-- ========================================
-- SETUP COMPLETE
-- ========================================
