import json
import re
from supabase import create_client
import os

# Load master list
with open("/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/samsung_master_appliances.json", "r") as f:
    master_list = json.load(f)

# Parse .env.local for Supabase connection
env_vars = {}
with open(".env.local", "r") as f:
    for line in f:
        match = re.match(r'^\s*([^#=\s]+)\s*=\s*(.*)$', line)
        if match:
            val = match[2].strip().strip('"').strip("'")
            env_vars[match[1]] = val

supabase = create_client(env_vars["NEXT_PUBLIC_SUPABASE_URL"], env_vars["SUPABASE_SERVICE_ROLE_KEY"])

def find_best_match(db_model, category):
    db_clean = db_model.replace(" ", "").replace("-", "").lower()
    matches = []
    
    for item in master_list:
        if item["category"] == category:
            item_clean = item["model"].replace(" ", "").replace("-", "").lower()
            # If the database model code matches a substring of the active model
            if db_clean in item_clean or item_clean in db_clean:
                matches.append(item)
                
    # Fallback to loose prefix matching if no exact substring match
    if not matches:
        # Check first 5 characters
        prefix = db_clean[:5]
        for item in master_list:
            if item["category"] == category:
                item_clean = item["model"].replace(" ", "").replace("-", "").lower()
                if item_clean.startswith(prefix) or prefix in item_clean:
                    matches.append(item)
                    
    return matches

async def main():
    # Query database for all Samsung products
    res = supabase.table("products").select("id, name, model_number, category").eq("brand", "Samsung").execute()
    db_products = res.data
    
    print("=== SAMSUNG DATABASE MATCHING RESULTS ===")
    for p in db_products:
        print(f"\nDB Product: {p['name']} | Model: {p['model_number']} | Category: {p['category']}")
        matches = find_best_match(p['model_number'], p['category'])
        if matches:
            print(f"Found {len(matches)} potential active matches in Samsung Master Catalog:")
            for m in matches[:3]:
                print(f"  -> Model: {m['model']} | Name: {m['name']} | URL: {m['url']}")
        else:
            print("  -> No active matches found in master sitemap.")

import asyncio
asyncio.run(main())
