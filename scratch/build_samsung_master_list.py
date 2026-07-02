import httpx
import xml.etree.ElementTree as ET
import re
import json
import os

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def parse_sitemap(url):
    print(f"Fetching sitemap: {url}...")
    r = httpx.get(url, headers=headers, timeout=90.0)
    if r.status_code != 200:
        print(f"Failed to fetch {url}")
        return []
    
    root = ET.fromstring(r.content)
    ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    
    urls = []
    for url_tag in root.findall("ns:url", ns):
        loc = url_tag.find("ns:loc", ns)
        if loc is not None:
            urls.append(loc.text)
    return urls

def extract_product_info(url, category):
    url_clean = url.rstrip('/')
    parts = url_clean.split('/')
    last_part = parts[-1]
    
    # Skip guide/overview pages
    if last_part in ["overview", "buying-guide", "bestseller", "ac-buying-guide", "compare", "notify-me"]:
        return None
        
    # Check if last part matches Samsung model code alphanumeric pattern
    # E.g. ar50h12d1zhnna (14 chars), qa55qef1aulxl (14 chars)
    # Let's extract the model code by looking at the last slug part
    model_candidate = last_part.upper()
    
    # If the model has dashes, often the last segment or last two segments is the model
    # E.g. split-ac-ar50h12d1zhnna -> model is ar50h12d1zhnna
    # E.g. 1500w-sound-tower-black-mx-t70-xl -> model is mx-t70-xl
    slug_parts = last_part.split('-')
    if len(slug_parts) >= 2:
        last_seg = slug_parts[-1].lower()
        if last_seg in ["xl", "nna", "tl", "na", "xxl"]:
            # Model code is the last two segments combined
            model_candidate = "-".join(slug_parts[-2:]).upper()
        else:
            # Check if last segment is alphanumeric of decent length
            if len(last_seg) >= 6 and any(c.isdigit() for c in last_seg) and any(c.isalpha() for c in last_seg):
                model_candidate = last_seg.upper()
            else:
                model_candidate = slug_parts[-1].upper()
                
    # Basic clean-up of common suffix/prefixes
    model_clean = model_candidate.strip()
    
    # Filter out categories and generic terms
    if model_clean.lower() in ["refrigerators", "air-conditioners", "washing-machines", "television", "split-ac", "front-load", "top-load", "side-by-side", "double-door", "single-door"]:
        return None
        
    # Model code must contain at least one digit and one letter to be a valid model number
    if not (any(c.isdigit() for c in model_clean) and any(c.isalpha() for c in model_clean)):
        return None
        
    # Build a reader-friendly name from URL slug
    name_words = [w.capitalize() for w in slug_parts if w.lower() not in ["xl", "nna", "tl", "na", "xxl", "nna", "na"]]
    name = " ".join(name_words)
    
    return {
        "model": model_clean,
        "name": name,
        "url": url,
        "category": category
    }

def main():
    da_urls = parse_sitemap("https://www.samsung.com/in/da-sitemap.xml")
    vd_urls = parse_sitemap("https://www.samsung.com/in/vd-sitemap.xml")
    
    products = []
    
    # Process Digital Appliances
    for url in da_urls:
        url_lower = url.lower()
        category = None
        if "/air-conditioners/" in url_lower:
            category = "AC"
        elif "/washing-machines/" in url_lower:
            category = "WM"
        elif "/refrigerators/" in url_lower:
            category = "FRIDGE"
            
        if category:
            info = extract_product_info(url, category)
            if info:
                products.append(info)
                
    # Process TVs
    for url in vd_urls:
        url_lower = url.lower()
        category = None
        if "/tvs/" in url_lower:
            category = "TV"
            
        if category:
            info = extract_product_info(url, category)
            if info:
                products.append(info)
                
    # Deduplicate by model
    unique_products = {}
    for p in products:
        unique_products[p["model"]] = p
        
    sorted_products = sorted(list(unique_products.values()), key=lambda x: (x["category"], x["model"]))
    
    # Save as JSON
    json_path = f"{ARTIFACTS_DIR}/samsung_master_appliances.json"
    with open(json_path, "w") as f:
        json.dump(sorted_products, f, indent=2)
    print(f"Saved {len(sorted_products)} products to {json_path}")
    
    # Save as Markdown catalog
    md_path = f"{ARTIFACTS_DIR}/samsung_master_catalog.md"
    with open(md_path, "w") as f:
        f.write("# Samsung India Master Appliances Catalog\n\n")
        f.write(f"Total unique products extracted from sitemaps: **{len(sorted_products)}**\n\n")
        
        categories = ["AC", "WM", "FRIDGE", "TV"]
        for cat in categories:
            cat_products = [p for p in sorted_products if p["category"] == cat]
            f.write(f"## Category: {cat} ({len(cat_products)} products)\n\n")
            f.write("| Model Code | Product Name | Direct Samsung Link |\n")
            f.write("|---|---|---|\n")
            for p in cat_products:
                f.write(f"| `{p['model']}` | {p['name']} | [View on Samsung]({p['url']}) |\n")
            f.write("\n")
            
    print(f"Saved markdown report to {md_path}")

if __name__ == "__main__":
    main()
