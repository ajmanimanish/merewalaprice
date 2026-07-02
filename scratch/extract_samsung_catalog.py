import httpx
import xml.etree.ElementTree as ET
import re

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def parse_sitemap(url):
    print(f"Fetching {url}...")
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

def clean_model_from_url(url, category):
    # Strip trailing slash
    url = url.rstrip('/')
    parts = url.split('/')
    last_part = parts[-1]
    
    # Check if last part is guide, buy, support, etc.
    if last_part in ["overview", "buying-guide", "bestseller", "ac-buying-guide"]:
        return None
        
    # Match standard samsung model patterns: e.g. ar50h12d1zhnna, ww70t4020ee, ua43cue60aklxl, etc.
    # Usually the model is at the very end of the URL slug
    slug_parts = last_part.split('-')
    
    # If the last part has a code ending in xl, or matches an alphanumeric pattern
    # Let's extract the likely model code
    model_candidate = slug_parts[-1].upper()
    
    # Sometimes it's the last two parts, e.g. hw-ls60d-xl
    if len(slug_parts) >= 2 and slug_parts[-1].lower() in ["xl", "nna", "tl", "na"]:
        model_candidate = (slug_parts[-2] + slug_parts[-1]).upper()
        
    return model_candidate

def main():
    da_urls = parse_sitemap("https://www.samsung.com/in/da-sitemap.xml")
    vd_urls = parse_sitemap("https://www.samsung.com/in/vd-sitemap.xml")
    
    catalog = {
        "AC": [],
        "WM": [],
        "FRIDGE": [],
        "TV": []
    }
    
    # Process DA Sitemap (AC, Washing Machine, Refrigerators)
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
            model = clean_model_from_url(url, category)
            if model and len(model) >= 5:
                catalog[category].append({
                    "model": model,
                    "url": url,
                    "slug": url.split('/')[-2]
                })
                
    # Process VD Sitemap (TVs)
    for url in vd_urls:
        url_lower = url.lower()
        category = None
        if "/tvs/" in url_lower:
            category = "TV"
            
        if category:
            model = clean_model_from_url(url, category)
            if model and len(model) >= 5:
                catalog[category].append({
                    "model": model,
                    "url": url,
                    "slug": url.split('/')[-2]
                })
                
    print("\n=== SAMSUNG INDIA MASTER APPLIANCE LIST ===")
    for cat, items in catalog.items():
        print(f"\nCategory: {cat} (Total: {len(items)})")
        # Print top 15 models in this category
        unique_items = {}
        for item in items:
            unique_items[item["model"]] = item
            
        print(f"Unique models found: {len(unique_items)}")
        for m in sorted(list(unique_items.keys()))[:15]:
            print(f" - Model: {m} | URL: {unique_items[m]['url']}")

main()
