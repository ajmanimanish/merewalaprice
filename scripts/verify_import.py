import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

products = supabase.table("products").select("id, brand, model_number, category").execute().data
prices = supabase.table("online_prices").select("product_id, price").execute().data

price_map = {}
for p in prices:
    pid = p["product_id"]
    if pid not in price_map:
        price_map[pid] = []
    price_map[pid].append(p["price"])

print(f"{'brand':<12} | {'model_number':<25} | {'category':<10} | {'price_sources':<13} | {'lowest_online_price':<20}")
print("-" * 90)

products.sort(key=lambda x: (x["category"], x["brand"]))
for prod in products:
    pid = prod["id"]
    sources = len(price_map.get(pid, []))
    min_price = min(price_map[pid]) if sources > 0 else None
    min_price_str = f"₹{min_price:,}" if min_price else "NULL"
    print(f"{prod['brand']:<12} | {prod['model_number']:<25} | {prod['category']:<10} | {sources:<13} | {min_price_str:<20}")
