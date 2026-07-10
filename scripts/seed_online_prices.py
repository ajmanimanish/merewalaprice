import os
import re
import random
from supabase import create_client
from dotenv import load_dotenv

# Load Supabase config from Next.js local env
load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

def estimate_base_price(p):
    name = p.get("name", "").lower()
    model = p.get("model_number", "").lower()
    category = p.get("category", "").upper()
    brand = p.get("brand", "").lower()

    if category == "AC":
        # Estimate capacity based on name/model
        capacity = 1.5
        if "2 ton" in name or "2.0 ton" in name or "24" in model or "2.0" in model:
            capacity = 2.0
        elif "1 ton" in name or "1.0 ton" in name or "12" in model or "1.0" in model:
            capacity = 1.0
            
        stars = 3
        if "5 star" in name or "5star" in name:
            stars = 5
            
        if capacity == 1.0:
            base = 31000 if stars == 5 else 27000
        elif capacity == 2.0:
            base = 49000 if stars == 5 else 42000
        else:
            base = 41000 if stars == 5 else 34000
            
        if any(x in brand for x in ["daikin", "general", "mitsubishi", "blue star"]):
            base += 3000
        elif any(x in brand for x in ["voltas", "haier", "godrej"]):
            base -= 2000
        return base

    elif category == "TV":
        # Estimate screen size
        size = 43
        m = re.search(r'\b(24|32|40|43|50|55|65|75|85)\b', name + " " + model)
        if m:
            size = int(m.group(1))
            
        is_qled = "qled" in name or "oled" in name or "nanocell" in name or "q60" in model
        
        if size == 24: base = 9000
        elif size == 32: base = 14000
        elif size == 40: base = 20000
        elif size == 43: base = 28000
        elif size == 50: base = 34000
        elif size == 55: base = 44000
        elif size == 65: base = 65000
        elif size == 75: base = 110000
        else: base = 180000
        
        if is_qled:
            base = int(base * 1.35)
        if "sony" in brand:
            base = int(base * 1.25)
        elif "samsung" in brand or "lg" in brand:
            base = int(base * 1.15)
        elif any(x in brand for x in ["xiaomi", "mi", "tcl", "vu"]):
            base = int(base * 0.85)
        return base

    elif category == "WM":
        is_front = "front load" in name or "front-load" in name or "fhm" in model or "ww" in model
        is_semi = "semi" in name or "semi-automatic" in name or "wtt" in model or "p70" in model
        
        capacity = 7.0
        m = re.search(r'\b(6|6\.5|7|7\.5|8|8\.5|9|10)\s*(kg)?\b', name)
        if m:
            try: capacity = float(m.group(1))
            except: pass
            
        if is_semi:
            base = 11000 if capacity >= 8 else 8500
        elif is_front:
            base = 32000 if capacity >= 8 else 27000
        else:
            base = 18500 if capacity >= 8 else 15500
            
        if "bosch" in brand or "ifb" in brand:
            base += 3000
        elif "samsung" in brand or "lg" in brand:
            base += 1500
        return base

    elif category == "FRIDGE":
        is_sbs = "side by side" in name or "sbs" in name or "french door" in name or "multi door" in name or "rf" in model or "gr-b" in model or "gr-a" in model
        is_single = "single door" in name or "1 door" in name or "rdc" in model or "direct cool" in name
        
        if is_sbs:
            base = 72000
        elif is_single:
            base = 14500
        else:
            base = 26000
            
        if "lg" in brand or "samsung" in brand:
            base += 2000
        elif any(x in brand for x in ["godrej", "voltas", "haier"]):
            base -= 2000
        return base

    elif category == "LAPTOP":
        is_i7 = "i7" in name or "ryzen 7" in name or "core i7" in name
        is_i5 = "i5" in name or "ryzen 5" in name or "core i5" in name
        is_mac = "macbook" in name or "apple" in brand
        
        if is_mac:
            base = 84000
        elif is_i7:
            base = 75000
        elif is_i5:
            base = 52000
        else:
            base = 34000
            
        if "asus" in brand or "dell" in brand:
            base += 1500
        return base

    else:
        return 25000

def round_to_market(val):
    val = int(val)
    remainder = val % 100
    if remainder < 50:
        return (val // 100) * 100 - 10
    else:
        return (val // 100) * 100 + 90

def run():
    print("Clearing existing online prices...")
    supabase.table("online_prices").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    print("Fetching products...")
    p_res = supabase.table("products").select("id, name, model_number, brand, category, asin, amazon_url, flipkart_url").execute()
    products = p_res.data

    print("Fetching dealer prices...")
    dp_res = supabase.table("dealer_prices").select("product_id, price").execute()
    dealer_prices = dp_res.data

    # Find lowest dealer price per product
    dealer_min = {}
    for dp in dealer_prices:
        pid = dp["product_id"]
        price = dp["price"]
        if pid not in dealer_min or price < dealer_min[pid]:
            dealer_min[pid] = price

    inserts = []
    print(f"Generating prices for {len(products)} products...")
    for p in products:
        pid = p["id"]
        brand = p["brand"]
        model = p["model_number"]
        asin = p.get("asin")
        
        # Estimate base market price
        base_price = estimate_base_price(p)
        lowest_dealer = dealer_min.get(pid)

        # Generate online prices (Amazon, Flipkart, Croma)
        p_amz = round_to_market(base_price * random.uniform(0.97, 1.01))
        p_fk = round_to_market(base_price * random.uniform(0.98, 1.02))
        p_cr = round_to_market(base_price * random.uniform(0.99, 1.04))

        # Adjust online prices relative to local dealer to showcase user savings
        if lowest_dealer:
            p_amz = max(p_amz, round_to_market(lowest_dealer * random.uniform(1.04, 1.09)))
            p_fk = max(p_fk, round_to_market(lowest_dealer * random.uniform(1.05, 1.11)))
            p_cr = max(p_cr, round_to_market(lowest_dealer * random.uniform(1.07, 1.13)))

        # Define URLs
        url_amz = p.get("amazon_url") or (f"https://www.amazon.in/dp/{asin}" if asin else f"https://www.amazon.in/s?k={brand.replace(' ', '+')}+{model.replace(' ', '+')}")
        url_fk = p.get("flipkart_url") or f"https://www.flipkart.com/search?q={brand.replace(' ', '+')}+{model.replace(' ', '+')}"
        url_cr = f"https://www.croma.com/search/?text={brand.replace(' ', '+')}+{model.replace(' ', '+')}"

        inserts.append({"product_id": pid, "platform": "amazon", "price": p_amz, "url": url_amz})
        inserts.append({"product_id": pid, "platform": "flipkart", "price": p_fk, "url": url_fk})
        inserts.append({"product_id": pid, "platform": "croma", "price": p_cr, "url": url_cr})

    # Batch insert to DB
    print(f"Writing {len(inserts)} price records to Supabase...")
    # Chunk inserts into batches of 100 to prevent request payload limits
    chunk_size = 100
    for i in range(0, len(inserts), chunk_size):
        chunk = inserts[i:i+chunk_size]
        supabase.table("online_prices").insert(chunk).execute()

    print("✅ Online prices seeded successfully for all appliances!")

if __name__ == "__main__":
    run()
