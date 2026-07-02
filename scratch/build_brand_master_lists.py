import asyncio
from playwright.async_api import async_playwright
import re
import json
import os

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

brands_sitemaps = [
    {
        "brand": "LG",
        "url": "https://www.lg.com/in/sitemap.xml",
        "parser": "lg"
    },
    {
        "brand": "Haier",
        "url": "https://www.haier.com/in/sitemap.xml",
        "parser": "haier"
    },
    {
        "brand": "BlueStar",
        "url": "https://www.bluestarindia.com/sitemap.xml",
        "parser": "bluestar"
    },
    {
        "brand": "Daikin",
        "url": "https://daikinindia.com/sitemap.xml",
        "parser": "daikin"
    },
    {
        "brand": "Voltas",
        "url": "https://www.voltas.com/sitemap.xml",
        "parser": "voltas"
    }
]

def clean_model_code(last_segment):
    model = last_segment.split('.')[0]
    model = model.strip('_-')
    return model.upper()

def parse_lg_url(url):
    url_lower = url.lower().rstrip('/')
    parts = url_lower.split('/')
    if len(parts) < 5:
        return None
        
    category = None
    if "/split-ac" in url_lower or "/window-ac" in url_lower:
        category = "AC"
    elif "/tvs" in url_lower:
        category = "TV"
    elif "/refrigerators" in url_lower:
        category = "FRIDGE"
    elif "/washing-machines" in url_lower:
        category = "WM"
        
    if not category:
        return None
        
    model = clean_model_code(parts[-1])
    if model.lower() in ["split-ac", "window-ac", "tvs", "refrigerators", "washing-machines", "lg-signature", "lg-object-collection"]:
        return None
    if not any(c.isdigit() for c in model):
        return None
        
    name = " ".join([w.capitalize() for w in parts[-1].split('-')])
    return {"brand": "LG", "model": model, "name": name, "url": url, "category": category}

def parse_haier_url(url):
    url_lower = url.lower().rstrip('/')
    parts = url_lower.split('/')
    if len(parts) < 5:
        return None
        
    category = None
    if "/air-conditioners" in url_lower:
        category = "AC"
    elif "/tvs" in url_lower:
        category = "TV"
    elif "/refrigerators" in url_lower:
        category = "FRIDGE"
    elif "/washing-machines" in url_lower:
        category = "WM"
        
    if not category:
        return None
        
    last_seg = parts[-1]
    if not last_seg.endswith(".shtml"):
        return None
        
    model = clean_model_code(last_seg)
    if model.lower() in ["air-conditioners", "tvs", "refrigerators", "washing-machines"]:
        return None
    if not any(c.isdigit() for c in model):
        return None
        
    name = " ".join([w.capitalize() for w in last_seg.split('.')[0].split('-')])
    return {"brand": "Haier", "model": model, "name": name, "url": url, "category": category}

def parse_bluestar_url(url):
    url_lower = url.lower().rstrip('/')
    parts = url_lower.split('/')
    if len(parts) < 4:
        return None
        
    category = None
    if "/roomacs/" in url_lower or "/split-air-conditioners" in url_lower or "/window-air-conditioners" in url_lower:
        category = "AC"
    elif "/refrigeration/" in url_lower or "/deep-freezers" in url_lower or "/water-coolers" in url_lower:
        category = "FRIDGE"
        
    if not category:
        return None
        
    last_seg = parts[-1]
    if last_seg in ["index.html", "overview.html", "features.html"]:
        return None
        
    model = clean_model_code(last_seg)
    if model.lower() in ["roomacs", "refrigeration", "deep-freezers", "details", "water-coolers"]:
        return None
    if not any(c.isdigit() for c in model):
        return None
        
    name = " ".join([w.capitalize() for w in last_seg.split('.')[0].split('-')])
    return {"brand": "BlueStar", "model": model, "name": name, "url": url, "category": category}

def parse_daikin_url(url):
    url_lower = url.lower().rstrip('/')
    parts = url_lower.split('/')
    if len(parts) < 4:
        return None
        
    category = None
    if "split" in url_lower or "cassette" in url_lower or "ac" in url_lower or "air-conditioner" in url_lower:
        category = "AC"
    elif "freezer" in url_lower or "refrigeration" in url_lower:
        category = "FRIDGE"
        
    if not category:
        return None
        
    last_seg = parts[-1]
    if last_seg in ["products", "splitac", "cassette", "chest-freezer"]:
        return None
        
    model = clean_model_code(last_seg)
    if not any(c.isdigit() for c in model):
        return None
        
    name = " ".join([w.capitalize() for w in last_seg.split('-')])
    return {"brand": "Daikin", "model": model, "name": name, "url": url, "category": category}

def parse_voltas_url(url):
    url_lower = url.lower().rstrip('/')
    parts = url_lower.split('/')
    if "/products/" not in url_lower:
        return None
        
    category = None
    if "air-conditioner" in url_lower or "-ac" in url_lower or "split-" in url_lower or "window-" in url_lower or "inverter-ac" in url_lower or "stabilizer" in url_lower:
        category = "AC"
    elif "washing-machine" in url_lower or "-washer" in url_lower or "semi-automatic" in url_lower:
        category = "WM"
    elif "refrigerator" in url_lower or "fridge" in url_lower or "frost-free" in url_lower or "direct-cool" in url_lower or "chest-freezer" in url_lower:
        category = "FRIDGE"
        
    if not category:
        return None
        
    last_seg = parts[-1]
    slug_parts = last_seg.split('-')
    
    # Extract any part of the slug that matches alphanumeric code containing both letters and digits
    model = None
    for part in slug_parts:
        if len(part) >= 4 and any(c.isdigit() for c in part) and any(c.isalpha() for c in part):
            model = part.upper()
            break
            
    # Fallback to last segment if no alphanumeric part found
    if not model:
        # Check if last part has digit
        if any(c.isdigit() for c in slug_parts[-1]):
            model = slug_parts[-1].upper()
            
    if not model:
        return None
        
    # Exclude common descriptors
    if model in ["1STAR", "2STAR", "3STAR", "4STAR", "5STAR", "1TON", "2TON"]:
        return None
        
    name = " ".join([w.capitalize() for w in last_seg.split('-')])
    return {"brand": "Voltas", "model": model, "name": name, "url": url, "category": category}

async def fetch_sitemap_urls(page, url):
    print(f"Navigating to: {url}...")
    await page.goto(url, timeout=45000)
    await page.wait_for_timeout(3000)
    content = await page.content()
    
    urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
    if not urls:
        text = await page.evaluate("() => document.body.innerText")
        urls = re.findall(r'https?://[^\s<]+', text)
    return [u.replace("&amp;", "&") for u in urls]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        master_catalog = []
        
        for item in brands_sitemaps:
            brand = item["brand"]
            print(f"\n======================================")
            print(f"PROCESSING BRAND: {brand}...")
            
            try:
                sitemap_url = item["url"]
                
                if brand == "Voltas":
                    urls = await fetch_sitemap_urls(page, sitemap_url)
                    prod_sitemap = None
                    for u in urls:
                        if "sitemap_products" in u:
                            prod_sitemap = u
                            break
                    if prod_sitemap:
                        print(f"Resolved Voltas products sitemap: {prod_sitemap}")
                        sitemap_url = prod_sitemap
                    else:
                        print("Failed to resolve Voltas products sitemap, skipping.")
                        continue
                
                urls = await fetch_sitemap_urls(page, sitemap_url)
                print(f"Total URLs found in sitemap: {len(urls)}")
                
                brand_products = []
                for u in urls:
                    info = None
                    if item["parser"] == "lg":
                        info = parse_lg_url(u)
                    elif item["parser"] == "haier":
                        info = parse_haier_url(u)
                    elif item["parser"] == "bluestar":
                        info = parse_bluestar_url(u)
                    elif item["parser"] == "daikin":
                        info = parse_daikin_url(u)
                    elif item["parser"] == "voltas":
                        info = parse_voltas_url(u)
                        
                    if info:
                        brand_products.append(info)
                        
                unique_brand_products = {}
                for bp in brand_products:
                    unique_brand_products[bp["model"]] = bp
                    
                dedup_list = list(unique_brand_products.values())
                print(f"Extracted {len(dedup_list)} unique product models for {brand}.")
                master_catalog.extend(dedup_list)
                
            except Exception as e:
                print(f"Error processing sitemap for {brand}: {e}")
                
        await browser.close()
        
        json_path = f"{ARTIFACTS_DIR}/multi_brand_master_catalog.json"
        with open(json_path, "w") as f:
            json.dump(master_catalog, f, indent=2)
        print(f"\nSaved {len(master_catalog)} total products to {json_path}")
        
        md_path = f"{ARTIFACTS_DIR}/multi_brand_catalog_report.md"
        with open(md_path, "w") as f:
            f.write("# Multi-Brand India Appliances Catalog\n\n")
            f.write(f"Total unique products compiled: **{len(master_catalog)}**\n\n")
            
            categories = ["AC", "WM", "FRIDGE", "TV"]
            for cat in categories:
                cat_items = [item for item in master_catalog if item["category"] == cat]
                f.write(f"## Category: {cat} ({len(cat_items)} products)\n\n")
                
                brands = sorted(list(set(item["brand"] for item in cat_items)))
                for b in brands:
                    brand_items = sorted([item for item in cat_items if item["brand"] == b], key=lambda x: x["model"])
                    f.write(f"### Brand: {b} ({len(brand_items)} products)\n\n")
                    f.write("| Model Code | Product Name | Direct Link |\n")
                    f.write("|---|---|---|\n")
                    for p in brand_items:
                        f.write(f"| `{p['model']}` | {p['name']} | [View Product]({p['url']}) |\n")
                    f.write("\n")
                    
        print(f"Saved markdown report to {md_path}")

if __name__ == "__main__":
    asyncio.run(main())
