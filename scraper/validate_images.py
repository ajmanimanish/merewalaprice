"""
Checks each product image URL - if the image URL contains keywords 
suggesting it's wrong (remote, stabilizer, accessory), clear it.
Also clears images that are clearly the wrong category.
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Fetch all products with images
result = supabase.table("products").select("id, name, brand, model_number, category, image_url").not_.is_("image_url", "null").execute()

cleared = 0
for p in result.data:
    img = p.get("image_url", "") or ""
    name = (p.get("name", "") or "").lower()
    model = (p.get("model_number", "") or "").lower()
    
    # Clear Unsplash placeholders
    if "unsplash" in img:
        supabase.table("products").update({"image_url": None}).eq("id", p["id"]).execute()
        print(f"  Cleared Unsplash: {p['brand']} {p['model_number']}")
        cleared += 1
        continue
    
    # Clear obviously wrong images
    # Amazon image URLs sometimes contain product info in the filename
    suspicious = [
        "remote", "stabilizer", "cover", "bag", "stand", 
        "bracket", "cable", "wire", "adaptor", "accessory"
    ]
    if any(s in name or s in model or s in img.lower() for s in suspicious):
        supabase.table("products").update({"image_url": None}).eq("id", p["id"]).execute()
        print(f"  Cleared wrong product: {p['brand']} {p['model_number']} ({name[:40]})")
        cleared += 1

print(f"\nCleared {cleared} images. Run enrich_images.py to re-fetch clean ones.")
