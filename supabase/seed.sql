-- MereWalaPrice Product Seed Data

-- Clear existing products to prevent duplicates
TRUNCATE TABLE products CASCADE;

INSERT INTO products (name, brand, category, model_number, specs, image_url, amazon_url, flipkart_url) VALUES
-- 1. Air Conditioners (AC)
(
  'Blue Star 1.5 Ton 5 Star Inverter Split AC',
  'Blue Star',
  'AC',
  'IE518PNU',
  '{"capacity": "1.5 Ton", "star_rating": 5, "features": "Inverter Compressor, 5-in-1 Convertible, Dust Filter, Copper Condenser"}',
  'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Blue+Star+IE518PNU',
  'https://www.flipkart.com/search?q=Blue+Star+IE518PNU'
),
(
  'Voltas 1.5 Ton 5 Star Inverter Split AC',
  'Voltas',
  'AC',
  '185V DZW',
  '{"capacity": "1.5 Ton", "star_rating": 5, "features": "Superdry Mode, Anti-Dust Filter, Copper Condenser, Multi-stage Filtration"}',
  'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Voltas+185V+DZW',
  'https://www.flipkart.com/search?q=Voltas+185V+DZW'
),
(
  'LG 1.5 Ton 5 Star AI DUAL Inverter Split AC',
  'LG',
  'AC',
  'PS-Q19YNZE',
  '{"capacity": "1.5 Ton", "star_rating": 5, "features": "AI DUAL Inverter, Super Convertible 6-in-1 Cooling, Gold Fin, HD Filter"}',
  'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=LG+PS-Q19YNZE',
  'https://www.flipkart.com/search?q=LG+PS-Q19YNZE'
),
(
  'Daikin 1.5 Ton 5 Star Inverter Split AC',
  'Daikin',
  'AC',
  'FTKR50TV',
  '{"capacity": "1.5 Ton", "star_rating": 5, "features": "Coanda Airflow, Power Chill Mode, Neo Swing Compressor, Stabilizer Free"}',
  'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Daikin+FTKR50TV',
  'https://www.flipkart.com/search?q=Daikin+FTKR50TV'
),
(
  'Samsung 1.5 Ton 5 Star Inverter Split AC',
  'Samsung',
  'AC',
  'AR18CY3ZAGP',
  '{"capacity": "1.5 Ton", "star_rating": 5, "features": "WindFree Cooling, 5-in-1 Convertible, Easy Filter Plus, Triple Protector Plus"}',
  'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Samsung+AR18CY3ZAGP',
  'https://www.flipkart.com/search?q=Samsung+AR18CY3ZAGP'
),

-- 2. Televisions (TV)
(
  'Samsung 43 inch 4K Ultra HD Smart LED TV',
  'Samsung',
  'TV',
  'UA43CUE60KLXL',
  '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Tizen OS, IoT Hub, Web Browser", "audio": "20W, Q-Symphony"}',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Samsung+UA43CUE60KLXL',
  'https://www.flipkart.com/search?q=Samsung+UA43CUE60KLXL'
),
(
  'LG 43 inch 4K Smart LED TV',
  'LG',
  'TV',
  '43UQ7500PSF',
  '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "WebOS, AI ThinQ, Magic Remote Supported", "audio": "20W, AI Sound"}',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=LG+43UQ7500PSF',
  'https://www.flipkart.com/search?q=LG+43UQ7500PSF'
),
(
  'Sony Bravia 43 inch 4K Smart LED Google TV',
  'Sony',
  'TV',
  'KD-43X74L',
  '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Google TV, Voice Search, Apple AirPlay", "audio": "20W, Dolby Audio"}',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Sony+KD-43X74L',
  'https://www.flipkart.com/search?q=Sony+KD-43X74L'
),
(
  'TCL 43 inch 4K HDR Smart Google TV',
  'TCL',
  'TV',
  '43P635',
  '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Google TV, Ok Google, HDR 10", "audio": "24W, Dolby Audio"}',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=TCL+43P635',
  'https://www.flipkart.com/search?q=TCL+43P635'
),
(
  'OnePlus 43 inch Y Series 4K Smart LED Google TV',
  'OnePlus',
  'TV',
  '43Y1S Pro',
  '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Google TV, OxygenPlay, OnePlus Connect", "audio": "24W, Dolby Audio"}',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=OnePlus+43Y1S+Pro',
  'https://www.flipkart.com/search?q=OnePlus+43Y1S+Pro'
),

-- 3. Washing Machines (WM)
(
  'LG 7 kg 5 Star Front Load Washing Machine',
  'LG',
  'WM',
  'FHM1207SDL',
  '{"capacity": "7 kg", "loading_type": "Front Load", "spin_speed": "1200 RPM", "features": "6 Motion DD, Inverter Direct Drive, Smart Diagnosis"}',
  'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=LG+FHM1207SDL',
  'https://www.flipkart.com/search?q=LG+FHM1207SDL'
),
(
  'Samsung 7 kg 5 Star Front Load Washing Machine',
  'Samsung',
  'WM',
  'WW70T4020EE',
  '{"capacity": "7 kg", "loading_type": "Front Load", "spin_speed": "1200 RPM", "features": "Hygiene Steam, Digital Inverter, Diamond Drum, Smart Check"}',
  'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Samsung+WW70T4020EE',
  'https://www.flipkart.com/search?q=Samsung+WW70T4020EE'
),
(
  'Whirlpool 7.5 kg 5 Star Top Load Washing Machine',
  'Whirlpool',
  'WM',
  '31514',
  '{"capacity": "7.5 kg", "loading_type": "Top Load", "spin_speed": "740 RPM", "features": "Spirowash, Hard Water Wash, 12 Wash Programs, Smart Sensors"}',
  'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Whirlpool+31514',
  'https://www.flipkart.com/search?q=Whirlpool+31514'
),
(
  'IFB 7 kg 5 Star Front Load Washing Machine',
  'IFB',
  'WM',
  'Senator WSS',
  '{"capacity": "7 kg", "loading_type": "Front Load", "spin_speed": "1200 RPM", "features": "Aqua Energie, 3D Wash, Express Wash, Crescent Toy Drum"}',
  'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=IFB+Senator+WSS',
  'https://www.flipkart.com/search?q=IFB+Senator+WSS'
),
(
  'Bosch 7 kg 5 Star Front Load Washing Machine',
  'Bosch',
  'WM',
  'WAJ2416WIN',
  '{"capacity": "7 kg", "loading_type": "Front Load", "spin_speed": "1200 RPM", "features": "EcoSilence Drive, AntiTangle, SpeedPerfect, VarioDrum"}',
  'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Bosch+WAJ2416WIN',
  'https://www.flipkart.com/search?q=Bosch+WAJ2416WIN'
),

-- 4. Refrigerators (FRIDGE)
(
  'LG 201 L 5 Star Direct Cool Single Door Refrigerator',
  'LG',
  'FRIDGE',
  'GL-B201APZY',
  '{"capacity": "201 L", "type": "Single Door", "star_rating": 5, "features": "Smart Inverter Compressor, Smart Connect, Moist Balance Crisper"}',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=LG+GL-B201APZY',
  'https://www.flipkart.com/search?q=LG+GL-B201APZY'
),
(
  'Samsung 183 L 5 Star Direct Cool Single Door Refrigerator',
  'Samsung',
  'FRIDGE',
  'RR21C2H25CU',
  '{"capacity": "183 L", "type": "Single Door", "star_rating": 5, "features": "Digital Inverter Compressor, Safe Clean Back, Base Stand with Drawer"}',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Samsung+RR21C2H25CU',
  'https://www.flipkart.com/search?q=Samsung+RR21C2H25CU'
),
(
  'Godrej 236 L 2 Star Frost Free Double Door Refrigerator',
  'Godrej',
  'FRIDGE',
  'RF EON 236B 25 HI',
  '{"capacity": "236 L", "type": "Double Door", "star_rating": 2, "features": "Nano Shield Technology, Multi Air Flow, Anti-Bacterial Gasket"}',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Godrej+RF+EON+236B+25+HI',
  'https://www.flipkart.com/search?q=Godrej+RF+EON+236B+25+HI'
),
(
  'Whirlpool 265 L 3 Star Convertible Double Door Refrigerator',
  'Whirlpool',
  'FRIDGE',
  'IF INV CNV 278',
  '{"capacity": "265 L", "type": "Double Door", "star_rating": 3, "features": "Convertible 5-in-1, Intellisense Inverter, Zeolite Technology"}',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Whirlpool+IF+INV+CNV+278',
  'https://www.flipkart.com/search?q=Whirlpool+IF+INV+CNV+278'
),

-- 5. Laptops (LAPTOP)
(
  'HP 15s AMD Ryzen 5 Laptop',
  'HP',
  'LAPTOP',
  '15s-eq2143AU',
  '{"processor": "AMD Ryzen 5 5500U", "ram": "8 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/dp/B09R27G9T3',
  'https://www.flipkart.com/search?q=HP+15s-eq2143AU'
),
(
  'Dell Inspiron 15 Laptop',
  'Dell',
  'LAPTOP',
  'Inspiron 3520',
  '{"processor": "Intel Core i5-1235U", "ram": "8 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD 120Hz", "os": "Windows 11 Home"}',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Dell+Inspiron+3520',
  'https://www.flipkart.com/search?q=Dell+Inspiron+3520'
),
(
  'Lenovo IdeaPad Slim 3 Laptop',
  'Lenovo',
  'LAPTOP',
  '82RK00VDIN',
  '{"processor": "Intel Core i5-1235U", "ram": "16 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD IPS", "os": "Windows 11 Home"}',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Lenovo+82RK00VDIN',
  'https://www.flipkart.com/search?q=Lenovo+82RK00VDIN'
),
(
  'ASUS Vivobook 15 Laptop',
  'ASUS',
  'LAPTOP',
  'X1502ZA-EJ522WS',
  '{"processor": "Intel Core i5-12500H", "ram": "8 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=ASUS+X1502ZA-EJ522WS',
  'https://www.flipkart.com/search?q=ASUS+X1502ZA-EJ522WS'
),
(
  'Acer Aspire 5 Laptop',
  'Acer',
  'LAPTOP',
  'A515-57G',
  '{"processor": "Intel Core i5-1240P", "ram": "12 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
  'https://www.amazon.in/s?k=Acer+A515-57G',
  'https://www.flipkart.com/search?q=Acer+A515-57G'
);

-- ==========================================
-- Task 4: Insert Approved Test Dealer Profile & Auth User
-- ==========================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert auth user for demo account (demo@merewalaprice.com / Demo@1234)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_sent_at,
  confirmation_sent_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Fixed demo user UUID
  'authenticated',
  'authenticated',
  'demo@merewalaprice.com',
  crypt('Demo@1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Insert matching approved dealer profile linked to the demo user UUID
INSERT INTO dealers (
  id,
  auth_user_id,
  shop_name,
  owner_name,
  phone,
  whatsapp,
  area,
  city,
  categories,
  brands,
  is_approved,
  subscription_status,
  created_at
)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Sharma Electronics Demo',
  'Sharma Ji',
  '9826123456',
  '919826123456',
  'MP Nagar',
  'Bhopal',
  ARRAY['AC', 'TV', 'WM']::product_category[],
  ARRAY['Samsung', 'LG', 'Voltas', 'Sony']::text[],
  true,
  'free',
  now()
) ON CONFLICT (id) DO NOTHING;

-- Expand products catalog to 80 products
INSERT INTO products (name, brand, category, model_number, specs, image_url, amazon_url, flipkart_url) VALUES
-- 1T ACs (smaller rooms, most affordable entry)
('Voltas 1 Ton 3 Star Inverter Split AC', 'Voltas', 'AC', '123V DZW',
 '{"capacity": "1 Ton", "star_rating": 3, "type": "Inverter Split", "features": "Dehumidifier, Sleep Mode, Auto Restart"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Voltas+123V+DZW', 'https://www.flipkart.com/search?q=Voltas+123V+DZW'),

('LG 1 Ton 5 Star DUAL Inverter Split AC', 'LG', 'AC', 'PS-Q12BNZE',
 '{"capacity": "1 Ton", "star_rating": 5, "type": "Inverter Split", "features": "DUAL Inverter, HD Filter, Auto Cleanser"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=LG+PS-Q12BNZE', 'https://www.flipkart.com/search?q=LG+PS-Q12BNZE'),

-- 1.5T 3-star (more affordable than 5-star)
('Blue Star 1.5 Ton 3 Star Inverter Split AC', 'Blue Star', 'AC', 'IC318YNUS',
 '{"capacity": "1.5 Ton", "star_rating": 3, "type": "Inverter Split", "features": "3-in-1 Convertible, Self Clean, Turbo Cool"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Blue+Star+IC318YNUS', 'https://www.flipkart.com/search?q=Blue+Star+IC318YNUS'),

('Daikin 1.5 Ton 3 Star Inverter Split AC', 'Daikin', 'AC', 'FTKL50TV',
 '{"capacity": "1.5 Ton", "star_rating": 3, "type": "Inverter Split", "features": "PM 2.5 Filter, Power Chill, Stabilizer Free"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Daikin+FTKL50TV', 'https://www.flipkart.com/search?q=Daikin+FTKL50TV'),

-- Hitachi (popular in MP)
('Hitachi 1.5 Ton 5 Star Inverter Split AC', 'Hitachi', 'AC', 'RSOG518HDEA',
 '{"capacity": "1.5 Ton", "star_rating": 5, "type": "Inverter Split", "features": "Frost Wash, PM 0.1 Filter, Auto Dual Fan"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Hitachi+RSOG518HDEA', 'https://www.flipkart.com/search?q=Hitachi+RSOG518HDEA'),

-- Lloyd (Havells — very popular in Tier 2)
('Lloyd 1.5 Ton 5 Star Inverter Split AC', 'Lloyd', 'AC', 'GLS18I5FWGEV',
 '{"capacity": "1.5 Ton", "star_rating": 5, "type": "Inverter Split", "features": "5-in-1 Convertible, Golden Fins, WiFi Ready"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Lloyd+GLS18I5FWGEV', 'https://www.flipkart.com/search?q=Lloyd+GLS18I5FWGEV'),

-- 2T ACs (larger rooms, commercial use)
('LG 2 Ton 5 Star DUAL Inverter Split AC', 'LG', 'AC', 'PS-Q24YNZE',
 '{"capacity": "2 Ton", "star_rating": 5, "type": "Inverter Split", "features": "DUAL Inverter, 6-in-1 Convertible, Ocean Black Protection"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=LG+PS-Q24YNZE', 'https://www.flipkart.com/search?q=LG+PS-Q24YNZE'),

('Voltas 2 Ton 3 Star Inverter Split AC', 'Voltas', 'AC', '243V DZW',
 '{"capacity": "2 Ton", "star_rating": 3, "type": "Inverter Split", "features": "4-in-1 Adjustable Modes, Superdry Mode, Turbo Cool"}',
 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Voltas+243V+DZW', 'https://www.flipkart.com/search?q=Voltas+243V+DZW'),

-- Additional TV models (32" most popular price segment)
('Samsung 32 inch HD Smart LED TV', 'Samsung', 'TV', 'UA32T4340AKXXL',
 '{"size": "32 inches", "resolution": "HD Ready 1366x768", "smart_features": "Tizen OS, Universal Guide, Auto Channel Search", "audio": "20W"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Samsung+UA32T4340AKXXL', 'https://www.flipkart.com/search?q=Samsung+UA32T4340AKXXL'),

('LG 32 inch HD Smart LED TV', 'LG', 'TV', '32LM563BPTC',
 '{"size": "32 inches", "resolution": "HD Ready 1366x768", "smart_features": "WebOS Lite, AI ThinQ, Bluetooth Surround Ready", "audio": "10W"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=LG+32LM563BPTC', 'https://www.flipkart.com/search?q=LG+32LM563BPTC'),

('VU 43 inch 4K Smart LED TV', 'VU', 'TV', '43UT',
 '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Android TV, Chromecast, Dolby Vision", "audio": "24W Surround Sound"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=VU+43UT', 'https://www.flipkart.com/search?q=VU+43UT'),

('Haier 43 inch 4K Smart LED TV', 'Haier', 'TV', 'LE43K7700HQGA',
 '{"size": "43 inches", "resolution": "4K Ultra HD", "smart_features": "Android TV, Google Assistant, Netflix", "audio": "24W Dolby Audio"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Haier+LE43K7700HQGA', 'https://www.flipkart.com/search?q=Haier+LE43K7700HQGA'),

('Motorola 55 inch 4K Smart QLED TV', 'Motorola', 'TV', '55SAUHDMQ',
 '{"size": "55 inches", "resolution": "4K QLED", "smart_features": "Android TV 11, Dolby Vision IQ, HDMI 2.1", "audio": "30W Dolby Atmos"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Motorola+55SAUHDMQ', 'https://www.flipkart.com/search?q=Motorola+55SAUHDMQ'),

('Samsung 55 inch 4K Smart QLED TV', 'Samsung', 'TV', 'QA55Q60DAKLXL',
 '{"size": "55 inches", "resolution": "4K QLED", "smart_features": "Tizen, Smart Hub, Motion Xcelerator", "audio": "20W Q-Symphony"}',
 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Samsung+QA55Q60DAKLXL', 'https://www.flipkart.com/search?q=Samsung+QA55Q60DAKLXL'),

-- Additional Washing Machines
('LG 6.5 Kg 5 Star Top Load Washing Machine', 'LG', 'WM', 'T65SKSF4Z',
 '{"capacity": "6.5 kg", "loading_type": "Top Load", "spin_speed": "700 RPM", "features": "Smart Inverter, Soak Mode, Lint Filter, Rat Away Protection"}',
 'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=LG+T65SKSF4Z', 'https://www.flipkart.com/search?q=LG+T65SKSF4Z'),

('Samsung 6.5 Kg 5 Star Top Load Washing Machine', 'Samsung', 'WM', 'WA65T4262BS',
 '{"capacity": "6.5 kg", "loading_type": "Top Load", "spin_speed": "700 RPM", "features": "Digital Inverter, Diamond Drum, Wobble Technology"}',
 'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Samsung+WA65T4262BS', 'https://www.flipkart.com/search?q=Samsung+WA65T4262BS'),

('Whirlpool 8 Kg 5 Star Front Load Washing Machine', 'Whirlpool', 'WM', 'XO8012BYS',
 '{"capacity": "8 kg", "loading_type": "Front Load", "spin_speed": "1200 RPM", "features": "6th Sense, Clean Cycle, Quick Wash, Child Lock"}',
 'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Whirlpool+XO8012BYS', 'https://www.flipkart.com/search?q=Whirlpool+XO8012BYS'),

('Haier 6.5 Kg Fully Automatic Top Load Washing Machine', 'Haier', 'WM', 'HWM65-826DNZP',
 '{"capacity": "6.5 kg", "loading_type": "Top Load", "spin_speed": "700 RPM", "features": "Vortex Wash, Magic Filter, Air Dry, Hard Water Wash"}',
 'https://images.unsplash.com/photo-1610557892470-76d74ae6220a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Haier+HWM65-826DNZP', 'https://www.flipkart.com/search?q=Haier+HWM65-826DNZP'),

-- Additional Refrigerators
('LG 260 L 3 Star Frost Free Double Door Refrigerator', 'LG', 'FRIDGE', 'GL-S292RDSY',
 '{"capacity": "260 L", "type": "Double Door", "star_rating": 3, "features": "Smart Inverter, Moist Balance Crisper, Auto Smart Connect"}',
 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=LG+GL-S292RDSY', 'https://www.flipkart.com/search?q=LG+GL-S292RDSY'),

('Samsung 253 L 3 Star Frost Free Double Door Refrigerator', 'Samsung', 'FRIDGE', 'RT28C3523S8',
 '{"capacity": "253 L", "type": "Double Door", "star_rating": 3, "features": "Twin Cooling Plus, Optimal Fresh Plus, Digital Inverter"}',
 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Samsung+RT28C3523S8', 'https://www.flipkart.com/search?q=Samsung+RT28C3523S8'),

('Haier 195 L 5 Star Direct Cool Single Door Refrigerator', 'Haier', 'FRIDGE', 'HRD-1954PMG-E',
 '{"capacity": "195 L", "type": "Single Door", "star_rating": 5, "features": "1 Hour Icing, Toughened Glass Shelf, Stabilizer Free, Moon Silver"}',
 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Haier+HRD-1954PMG-E', 'https://www.flipkart.com/search?q=Haier+HRD-1954PMG-E'),

('Voltas Beko 340 L 3 Star Frost Free Double Door Refrigerator', 'Voltas', 'FRIDGE', 'RFF363IF',
 '{"capacity": "340 L", "type": "Double Door", "star_rating": 3, "features": "NeoFrost Dual Cooling, IonGuard, 4D Air Circulation"}',
 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Voltas+RFF363IF', 'https://www.flipkart.com/search?q=Voltas+RFF363IF'),

-- Budget laptops (under ₹35K — highest volume segment)
('HP Laptop 15 Core i3', 'HP', 'LAPTOP', '15s-fq5007TU',
 '{"processor": "Intel Core i3-1215U", "ram": "8 GB DDR4", "storage": "256 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=HP+15s-fq5007TU', 'https://www.flipkart.com/search?q=HP+15s-fq5007TU'),

('Lenovo IdeaPad 1 Laptop', 'Lenovo', 'LAPTOP', '82V700DYIN',
 '{"processor": "Intel Core i3-1215U", "ram": "8 GB DDR4", "storage": "256 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=Lenovo+82V700DYIN', 'https://www.flipkart.com/search?q=Lenovo+82V700DYIN'),

('ASUS VivoBook 15 AMD Ryzen 5 Laptop', 'ASUS', 'LAPTOP', 'M515DA-EJ512WS',
 '{"processor": "AMD Ryzen 5 3500U", "ram": "8 GB DDR4", "storage": "512 GB SSD", "display": "15.6-inch FHD", "os": "Windows 11 Home"}',
 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400',
 'https://www.amazon.in/s?k=ASUS+M515DA-EJ512WS', 'https://www.flipkart.com/search?q=ASUS+M515DA-EJ512WS')
ON CONFLICT (model_number) DO NOTHING;

-- Seed prices for demo dealer (exactly 20 products from original + Part 2)
INSERT INTO dealer_prices (dealer_id, product_id, price, stock_status, inclusions)
VALUES
-- Original 5 ACs
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'IE518PNU' LIMIT 1), 35800, 'in_stock', ARRAY['Free Installation', 'Free Copper Pipe (3ft)']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '185V DZW' LIMIT 1), 34500, 'in_stock', ARRAY['Free Installation']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'PS-Q19YNZE' LIMIT 1), 37200, 'in_stock', ARRAY['Free Installation', 'Extra Warranty']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'FTKR50TV' LIMIT 1), 36800, 'in_stock', ARRAY['Free Installation', 'Free Copper Pipe (3ft)']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'AR18CY3ZAGP' LIMIT 1), 35200, 'in_stock', ARRAY['Free Installation']),
-- 3 TVs
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'UA43CUE60KLXL' LIMIT 1), 27500, 'in_stock', ARRAY['Free Wall Mount']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '43UQ7500PSF' LIMIT 1), 26800, 'in_stock', ARRAY['Free Wall Mount']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'KD-43X74L' LIMIT 1), 32500, 'in_stock', ARRAY['Free Wall Mount', '0% EMI']),
-- 3 Washing Machines
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'FHM1207SDL' LIMIT 1), 18500, 'in_stock', ARRAY['Free Installation', 'Free Delivery']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'WW70T4020EE' LIMIT 1), 17800, 'in_stock', ARRAY['Free Installation']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '31514' LIMIT 1), 15200, 'in_stock', ARRAY['Free Installation']),
-- 2 Fridges
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'GL-B201APZY' LIMIT 1), 14500, 'in_stock', ARRAY['Free Delivery']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'RR21C2H25CU' LIMIT 1), 13800, 'in_stock', ARRAY['Free Delivery']),
-- 3 Laptops
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '15s-eq2143AU' LIMIT 1), 44500, 'in_stock', ARRAY['Free Laptop Bag']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'Inspiron 3520' LIMIT 1), 42800, 'in_stock', ARRAY['Free Laptop Bag']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '82RK00VDIN' LIMIT 1), 46200, 'in_stock', ARRAY['Free Laptop Bag']),
-- 4 of the new models
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'FTKL50TV' LIMIT 1), 33800, 'in_stock', ARRAY['Free Installation']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'UA32T4340AKXXL' LIMIT 1), 14800, 'in_stock', ARRAY['Free Wall Mount']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = 'WA65T4262BS' LIMIT 1), 15500, 'in_stock', ARRAY['Free Installation']),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', (SELECT id FROM products WHERE model_number = '15s-fq5007TU' LIMIT 1), 31200, 'in_stock', ARRAY['Free Laptop Bag'])
ON CONFLICT (dealer_id, product_id) DO UPDATE 
SET price = EXCLUDED.price, stock_status = EXCLUDED.stock_status, inclusions = EXCLUDED.inclusions;

