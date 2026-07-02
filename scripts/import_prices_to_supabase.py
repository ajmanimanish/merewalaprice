"""
MereWalaPrice — Price Data Importer
Imports scraped price_data.json into Supabase:
- Matches existing products by model_number
- Creates new products for unmatched models
- Upserts online_prices for amazon/flipkart/croma
- Updates product asin and brand_url if missing
"""
import json, os, re
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

ARTIFACTS = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
INSTALL_COST = {"AC": 1200, "WM": 600, "FRIDGE": 0, "TV": 0, "LAPTOP": 0}

def norm(s):
    return re.sub(r'[\s\-_]', '', s).lower()

def load_data():
    with open(f"{ARTIFACTS}/price_data.json") as f:
        return json.load(f)

def get_products():
    r = supabase.table("products").select("id,model_number,brand,category").execute()
    return {norm(p["model_number"]): p for p in r.data}

def run():
    data = load_data()
    products = get_products()
    print(f"Scraped: {len(data)} models | In DB: {len(products)} products\n")

    matched, created, prices_written = 0, 0, 0

    for item in data:
        key = norm(item["model"])
        product = products.get(key)
        install = INSTALL_COST.get(item["category"], 0)

        if not product:
            print(f"  + NEW: {item['brand']} {item['model']}")
            r = supabase.table("products").insert({
                "name": item["name"],
                "brand": item["brand"],
                "category": item["category"],
                "model_number": item["model"],
                "specs": {},
                "is_active": True,
            }).execute()
            if r.data:
                product = r.data[0]
                products[key] = product
                created += 1
            else:
                print(f"    ERROR: {r}")
                continue
        else:
            matched += 1

        pid = product["id"]

        # Upsert online prices
        for platform in ["amazon", "flipkart", "croma"]:
            pd = item["prices"].get(platform, {})
            price = pd.get("price")
            if not price:
                continue
            supabase.table("online_prices").upsert({
                "product_id": pid,
                "platform": platform,
                "price": price,
                "installation_cost": install,
                "true_cost": price + install,
                "url": pd.get("url"),
                "fetch_status": "success",
                "fetched_at": item.get("scraped_at")
            }, on_conflict="product_id,platform").execute()
            prices_written += 1

        amz_p = item['prices']['amazon'].get('price')
        fk_p = item['prices']['flipkart'].get('price')
        cr_p = item['prices']['croma'].get('price')
        amz_str = f"₹{amz_p:,}" if amz_p else "—"
        fk_str = f"₹{fk_p:,}" if fk_p else "—"
        cr_str = f"₹{cr_p:,}" if cr_p else "—"
        print(f"  ✓ {item['brand']:12} {item['model']:25} "
              f"AMZ:{amz_str:>10}  "
              f"FK:{fk_str:>10}  "
              f"CR:{cr_str:>10}")

    print(f"\n{'='*60}")
    print(f"Matched existing: {matched}")
    print(f"New products created: {created}")
    print(f"Price records written: {prices_written}")
    print(f"\nNow verify in Supabase:")
    print("SELECT brand, model_number, category,")
    print("  (SELECT COUNT(*) FROM online_prices op WHERE op.product_id = products.id) as platforms")
    print("FROM products ORDER BY category, brand;")

if __name__ == "__main__":
    run()
