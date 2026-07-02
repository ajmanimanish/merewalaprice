"""
Select 200 popular models across categories AC, FRIDGE, WM, TV.
Distribute them evenly across categories (50 each) and major brands.
Save to popular_50_models.json.
"""
import json, re

POPULAR_50_PATH = "/Users/manish/Desktop/merawalaprice/scratch/popular_50_models.json"
MULTI_BRAND_PATH = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/multi_brand_master_catalog.json"
SAMSUNG_PATH = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/samsung_master_appliances.json"

def norm(s):
    return re.sub(r'[\s\-_]', '', s).lower()

def main():
    # Load 49 verified models
    with open(POPULAR_50_PATH) as f:
        verified = json.load(f)
    
    print(f"Loaded {len(verified)} verified models.")
    verified_models = {norm(x["model"]): x for x in verified}
    
    # Group verified by category
    by_cat = {"AC": [], "FRIDGE": [], "WM": [], "TV": []}
    for x in verified:
        by_cat[x["category"]].append(x)
        
    # Load master catalog files
    with open(MULTI_BRAND_PATH) as f:
        multi_brand = json.load(f)
    with open(SAMSUNG_PATH) as f:
        samsung = json.load(f)
        
    # Standardize samsung brand and company_url
    for x in samsung:
        x["brand"] = "Samsung"
        if "url" in x and "company_url" not in x:
            x["company_url"] = x["url"]
            
    # Standardize multi_brand
    for x in multi_brand:
        if x["brand"] == "BlueStar":
            x["brand"] = "Blue Star"
        if "url" in x and "company_url" not in x:
            x["company_url"] = x["url"]
            
    # Merge candidates
    candidates = multi_brand + samsung
    print(f"Total candidates: {len(candidates)}")
    
    # Filter candidates
    valid_candidates = []
    seen = set(verified_models.keys())
    for x in candidates:
        model_norm = norm(x["model"])
        if model_norm in seen:
            continue
        if len(x["model"]) < 4 or len(x["model"]) > 25:
            continue  # Avoid weird short or long model names
        # Avoid model numbers that are just numbers (e.g. 31256, wait, some whirlpool models are numbers, but let's avoid overly generic ones)
        if x["model"].isdigit() and len(x["model"]) < 5:
            continue
        
        seen.add(model_norm)
        valid_candidates.append(x)
        
    print(f"Filtered to {len(valid_candidates)} potential new candidates.")
    
    # Select candidates to reach 50 per category
    for cat in ["AC", "FRIDGE", "WM", "TV"]:
        current_list = by_cat[cat]
        needed = 50 - len(current_list)
        print(f"Category {cat}: currently has {len(current_list)} models, need {needed} more.")
        
        cat_candidates = [x for x in valid_candidates if x["category"] == cat]
        
        # We want to distribute them evenly across brands
        # Group candidates by brand
        by_brand = {}
        for x in cat_candidates:
            b = x["brand"]
            if b not in by_brand:
                by_brand[b] = []
            by_brand[b].append(x)
            
        print(f"  Available brands for {cat}: {list(by_brand.keys())}")
        
        # Round-robin selection across brands
        selected_for_cat = []
        brand_list = list(by_brand.keys())
        brand_idx = {b: 0 for b in brand_list}
        
        # Prioritize brands to get even distribution
        while len(selected_for_cat) < needed and any(brand_idx[b] < len(by_brand[b]) for b in brand_list):
            for b in brand_list:
                if len(selected_for_cat) >= needed:
                    break
                idx = brand_idx[b]
                if idx < len(by_brand[b]):
                    item = by_brand[b][idx]
                    # Clean up the product name if it's too raw
                    # If name is just the model, try to construct a nicer name
                    if norm(item["name"]) == norm(item["model"]):
                        item["name"] = f"{item['brand']} {item['category']} {item['model']}"
                    selected_for_cat.append(item)
                    brand_idx[b] += 1
                    
        print(f"  Selected {len(selected_for_cat)} models for {cat}.")
        by_cat[cat].extend(selected_for_cat)
        
    # Combine all
    final_200 = []
    for cat in ["AC", "FRIDGE", "WM", "TV"]:
        final_200.extend(by_cat[cat])
        
    print(f"Final total models: {len(final_200)}")
    
    # Save to popular_50_models.json
    with open(POPULAR_50_PATH, 'w') as f:
        json.dump(final_200, f, indent=2, ensure_ascii=False)
        
    print(f"Saved to {POPULAR_50_PATH}.")

if __name__ == "__main__":
    main()
