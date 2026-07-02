-- MereWalaPrice Database Schema Migration

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables/types if they exist (for clean setup)
DROP TABLE IF EXISTS notifications_log CASCADE;
DROP TABLE IF EXISTS online_prices CASCADE;
DROP TABLE IF EXISTS dealer_offers CASCADE;
DROP TABLE IF EXISTS buyer_requests CASCADE;
DROP TABLE IF EXISTS dealers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

DROP TYPE IF EXISTS product_category CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS urgency_type CASCADE;
DROP TYPE IF EXISTS purchase_type CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS availability_type CASCADE;
DROP TYPE IF EXISTS offer_status CASCADE;
DROP TYPE IF EXISTS online_platform CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;

-- Enums
CREATE TYPE product_category AS ENUM ('AC', 'TV', 'FRIDGE', 'WM', 'LAPTOP');
CREATE TYPE subscription_tier AS ENUM ('free', 'paid');
CREATE TYPE urgency_type AS ENUM ('today', 'this_week', 'exploring');
CREATE TYPE purchase_type AS ENUM ('personal', 'business', 'bulk');
CREATE TYPE request_status AS ENUM ('open', 'fulfilled', 'expired');
CREATE TYPE availability_type AS ENUM ('today', '1-2days', '4-5days');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE online_platform AS ENUM ('amazon', 'flipkart', 'croma');
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'sms');
CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'failed');

-- Table 1: products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category product_category NOT NULL,
  model_number TEXT NOT NULL UNIQUE,
  variants JSONB DEFAULT '[]'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  amazon_url TEXT,
  flipkart_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table 2: dealers
CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bhopal',
  categories product_category[] DEFAULT '{}'::product_category[],
  brands TEXT[] DEFAULT '{}'::TEXT[],
  is_approved BOOLEAN DEFAULT false,
  subscription_status subscription_tier DEFAULT 'free',
  subscription_ends DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table 3: buyer_requests
CREATE TABLE buyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  budget INTEGER NOT NULL,
  area TEXT NOT NULL,
  urgency urgency_type NOT NULL,
  purchase_type purchase_type NOT NULL,
  quantity INTEGER DEFAULT 1,
  status request_status DEFAULT 'open',
  access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table 4: dealer_offers
CREATE TABLE dealer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES buyer_requests(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  inclusions TEXT[] DEFAULT '{}'::text[],
  availability availability_type NOT NULL,
  alternative_model TEXT,
  alternative_price INTEGER,
  alternative_note TEXT,
  status offer_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table 5: online_prices
CREATE TABLE online_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform online_platform NOT NULL,
  price INTEGER,
  offer_details TEXT,
  installation_cost INTEGER DEFAULT 0,
  true_cost INTEGER,
  url TEXT,
  fetch_status TEXT DEFAULT 'success',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_product_platform UNIQUE (product_id, platform)
);

-- Table 6: notifications_log
CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  request_id UUID REFERENCES buyer_requests(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Custom Settings helper for Anonymous Buyers to set their token (RLS layer)
CREATE OR REPLACE FUNCTION set_request_token(token TEXT) 
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.request_token', token, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- 1. Policies for products
CREATE POLICY select_products_public ON products
  FOR SELECT USING (true);

-- 2. Policies for dealers
CREATE POLICY select_dealers_public ON dealers
  FOR SELECT USING (true);

CREATE POLICY insert_dealers_public ON dealers
  FOR INSERT WITH CHECK (true);

CREATE POLICY update_dealers_owner ON dealers
  FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- 3. Policies for buyer_requests
-- Public can create requests
CREATE POLICY insert_buyer_requests_public ON buyer_requests
  FOR INSERT WITH CHECK (true);

-- Users can select if:
-- A) They are an approved dealer matching the city and product category
-- B) They are the buyer who knows the request ID and token (enforced via session variable)
CREATE POLICY select_buyer_requests_auth ON buyer_requests
  FOR SELECT USING (
    -- Case A: Approved dealer matching request details
    EXISTS (
      SELECT 1 FROM dealers d
      JOIN products p ON p.id = buyer_requests.product_id
      WHERE d.auth_user_id = auth.uid()
        AND d.is_approved = true
        AND d.city = buyer_requests.area -- Or Bhopal (same city)
        AND p.category = ANY(d.categories)
    )
    OR
    -- Case B: Buyer with correct token in session
    (access_token = coalesce(current_setting('app.request_token', true), ''))
  );

-- 4. Policies for dealer_offers
-- Approved dealers can insert offers
CREATE POLICY insert_dealer_offers_dealer ON dealer_offers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealers d
      WHERE d.id = dealer_offers.dealer_id
        AND d.auth_user_id = auth.uid()
        AND d.is_approved = true
    )
  );

-- Dealers see only their own offers. Buyers see only offers on their requests.
CREATE POLICY select_dealer_offers_auth ON dealer_offers
  FOR SELECT USING (
    -- Case A: Dealer sees their own offers
    EXISTS (
      SELECT 1 FROM dealers d
      WHERE d.id = dealer_offers.dealer_id
        AND d.auth_user_id = auth.uid()
    )
    OR
    -- Case B: Buyer sees offers on their request
    EXISTS (
      SELECT 1 FROM buyer_requests r
      WHERE r.id = dealer_offers.request_id
        AND r.access_token = coalesce(current_setting('app.request_token', true), '')
    )
  );

-- Dealers can update their own offers
CREATE POLICY update_dealer_offers_dealer ON dealer_offers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM dealers d
      WHERE d.id = dealer_offers.dealer_id
        AND d.auth_user_id = auth.uid()
        AND d.is_approved = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealers d
      WHERE d.id = dealer_offers.dealer_id
        AND d.auth_user_id = auth.uid()
        AND d.is_approved = true
    )
  );

-- 5. Policies for online_prices
CREATE POLICY select_online_prices_public ON online_prices
  FOR SELECT USING (true);

-- 6. Policies for notifications_log
CREATE POLICY select_notifications_log_public ON notifications_log
  FOR SELECT USING (true);

-- Thread-safe RPC function to retrieve all request results in one database call
CREATE OR REPLACE FUNCTION get_request_details(req_id UUID, token TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'request', json_build_object(
      'id', r.id,
      'product_id', r.product_id,
      'buyer_phone', r.buyer_phone,
      'buyer_name', r.buyer_name,
      'budget', r.budget,
      'area', r.area,
      'urgency', r.urgency,
      'purchase_type', r.purchase_type,
      'quantity', r.quantity,
      'status', r.status,
      'expires_at', r.expires_at,
      'created_at', r.created_at
    ),
    'product', json_build_object(
      'id', p.id,
      'name', p.name,
      'brand', p.brand,
      'category', p.category,
      'model_number', p.model_number,
      'image_url', p.image_url,
      'amazon_url', p.amazon_url,
      'flipkart_url', p.flipkart_url
    ),
    'offers', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', o.id,
            'price', o.price,
            'inclusions', o.inclusions,
            'availability', o.availability,
            'alternative_model', o.alternative_model,
            'alternative_price', o.alternative_price,
            'alternative_note', o.alternative_note,
            'status', o.status,
            'created_at', o.created_at,
            'dealer', json_build_object(
              'shop_name', d.shop_name,
              'owner_name', d.owner_name,
              'area', d.area,
              'phone', d.phone,
              'whatsapp', d.whatsapp
            )
          ) ORDER BY o.price ASC
        )
        FROM dealer_offers o
        JOIN dealers d ON d.id = o.dealer_id
        WHERE o.request_id = r.id
      ),
      '[]'::json
    ),
    'online_prices', COALESCE(
      (
        SELECT json_agg(op.*)
        FROM online_prices op
        WHERE op.product_id = r.product_id
      ),
      '[]'::json
    )
  ) INTO result
  FROM buyer_requests r
  JOIN products p ON p.id = r.product_id
  WHERE r.id = req_id AND r.access_token = token;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. user_profiles table and policies
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  preferred_area TEXT,
  city TEXT DEFAULT 'Bhopal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8. Add email column to dealers table
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS email TEXT;

-- 9. Add address, latitude, and longitude to dealers table
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 10. dealer_prices table
CREATE TABLE IF NOT EXISTS dealer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  stock_status TEXT DEFAULT 'in_stock' 
    CHECK (stock_status IN ('in_stock', 'out_of_stock', 'limited')),
  inclusions TEXT[] DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dealer_id, product_id)
);
ALTER TABLE dealer_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view dealer prices" ON dealer_prices 
  FOR SELECT USING (true);
CREATE POLICY "Dealers manage own prices" ON dealer_prices 
  FOR ALL USING (
    dealer_id IN (SELECT id FROM dealers WHERE auth_user_id = auth.uid())
  );

-- 11. product_views
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  city TEXT DEFAULT 'Bhopal'
);
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert views" ON product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read views" ON product_views FOR SELECT USING (true);

-- 12. user_searches
CREATE TABLE IF NOT EXISTS user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  search_query TEXT,
  access_token TEXT,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE user_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own searches" ON user_searches 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own searches" ON user_searches 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. Add phone_shared to buyer_requests
ALTER TABLE buyer_requests 
  ADD COLUMN IF NOT EXISTS phone_shared BOOLEAN DEFAULT false;

-- 14. Add short_code to buyer_requests
ALTER TABLE buyer_requests 
  ADD COLUMN IF NOT EXISTS short_code TEXT;

-- 14b. Add whats_different to buyer_requests
ALTER TABLE buyer_requests
  ADD COLUMN IF NOT EXISTS whats_different TEXT;

-- 15. Add unique constraint on dealer_offers for upsert
ALTER TABLE dealer_offers 
  ADD CONSTRAINT unique_dealer_request 
  UNIQUE (dealer_id, request_id);

-- 16. ai_waitlist table
CREATE TABLE IF NOT EXISTS ai_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE ai_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON ai_waitlist 
  FOR INSERT WITH CHECK (true);

-- 17. Add missing columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS asin TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2025;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER;

-- 18. Add fetched_at column alias for staleness check
ALTER TABLE online_prices ADD COLUMN IF NOT EXISTS fetched_at 
  TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 19. Expand online_platform enum to include more retailers
ALTER TABLE online_prices ALTER COLUMN platform TYPE TEXT;
DROP TYPE IF EXISTS online_platform CASCADE;
CREATE TYPE online_platform AS ENUM ('amazon', 'flipkart', 'croma', 'reliance', 'lotus');
ALTER TABLE online_prices ALTER COLUMN platform TYPE online_platform 
  USING platform::online_platform;

-- 20. Bank offers table
CREATE TABLE IF NOT EXISTS bank_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  bank TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'Credit',
  offer_type TEXT NOT NULL DEFAULT 'instant',
  discount_percent INTEGER,
  max_discount INTEGER,
  min_order INTEGER DEFAULT 0,
  emi_months INTEGER,
  offer_text TEXT NOT NULL,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE bank_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bank offers" ON bank_offers FOR SELECT USING (true);
CREATE POLICY "Service manages bank offers" ON bank_offers 
  FOR ALL USING (auth.role() = 'service_role');

-- 21. Seed July 2025 bank offers
INSERT INTO bank_offers 
  (platform, bank, card_type, offer_type, discount_percent, max_discount, min_order, offer_text) 
VALUES
('amazon','HDFC','Credit','instant',10,1500,5000,'Get 10% instant discount up to ₹1,500 on HDFC Bank Credit Cards on orders above ₹5,000'),
('amazon','ICICI','Credit','instant',10,1250,5000,'Get 10% instant discount up to ₹1,250 on ICICI Bank Credit Cards'),
('amazon','SBI','Credit','instant',10,1500,5000,'Get 10% instant discount up to ₹1,500 on SBI Credit Cards'),
('amazon','Axis','Credit','cashback',5,750,3000,'Get 5% cashback up to ₹750 on Axis Bank Credit Cards'),
('amazon','HDFC','All','emi',NULL,NULL,10000,'No Cost EMI on HDFC Bank Cards — 3, 6, 9 months'),
('flipkart','ICICI','Credit','instant',5,750,5000,'Get 5% instant discount up to ₹750 on ICICI Bank Credit Cards'),
('flipkart','Axis','Credit','instant',5,500,3000,'Get 5% instant discount up to ₹500 on Axis Bank MyZone Credit Cards'),
('flipkart','HDFC','All','emi',NULL,NULL,10000,'No Cost EMI on HDFC Bank Cards — 3, 6, 9, 12 months'),
('croma','SBI','Credit','instant',NULL,2000,35000,'Get ₹2,000 off on SBI Credit Cards on purchases above ₹35,000'),
('croma','HDFC','Credit','cashback',10,1500,20000,'Get 10% cashback up to ₹1,500 on HDFC Credit Cards'),
('croma','ICICI','All','emi',NULL,NULL,15000,'No Cost EMI on ICICI Bank Cards'),
('reliance','HDFC','Credit','instant',10,1500,15000,'Get 10% instant discount up to ₹1,500 on HDFC Bank Credit Cards'),
('reliance','Kotak','Credit','instant',7,1000,10000,'Get 7% instant discount up to ₹1,000 on Kotak Bank Cards');
