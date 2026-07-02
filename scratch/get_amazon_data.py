import asyncio
import re
import os
import json
from playwright.async_api import async_playwright

# Artifacts dir to save screenshots
ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

PRODUCTS_TO_SEARCH = [
    {"brand": "Blue Star", "model": "IE518PNU", "category": "AC", "query": "Blue Star IE518PNU"},
    {"brand": "Voltas", "model": "185V DZW", "category": "AC", "query": "Voltas 1.5 Ton 5 Star Inverter Split AC 185V DZW"},
    {"brand": "LG", "model": "PS-Q19YNZE", "category": "AC", "query": "LG PS-Q19YNZE"},
    {"brand": "Samsung", "model": "UA43CUE60KLXL", "category": "TV", "query": "Samsung UA43CUE60AKLXL"},
    {"brand": "Samsung", "model": "WW70T4020EE", "category": "WM", "query": "Samsung WW70T4020EE"}
]

async def scrape_product(p, playwright):
    model = p["model"]
    brand = p["brand"]
    query = p["query"]
    
    print(f"\nSearching for {brand} {model} using query: '{query}'...")
    
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 1000}
    )
    page = await context.new_page()
    
    # Enable request intercept to block media or analytics to load faster
    search_url = f"https://www.amazon.in/s?k={re.sub(r' ', '+', query)}"
    await page.goto(search_url, timeout=30000)
    
    # Wait for results
    await page.wait_for_selector(".s-result-item", timeout=15000)
    
    # Find matching product link from search results
    items = await page.query_selector_all(".s-result-item")
    product_link = None
    
    for item in items:
        # Check title
        title_el = await item.query_selector("h2 a span")
        if title_el:
            title_text = await title_el.inner_text()
            # Loose match model number and brand
            clean_model = model.replace(" ", "").lower()
            clean_title = title_text.replace(" ", "").lower()
            # If TV search was for UA43CUE60KLXL, match CUE60 or UA43CUE60
            match_terms = [clean_model]
            if model == "UA43CUE60KLXL":
                match_terms = ["cue60", "ua43cue60"]
            elif model == "185V DZW":
                match_terms = ["185v", "dzw"]
                
            if brand.lower() in clean_title and any(term in clean_title for term in match_terms):
                link_el = await item.query_selector("h2 a")
                if link_el:
                    href = await link_el.get_attribute("href")
                    if href:
                        product_link = f"https://www.amazon.in{href}"
                        break
                        
    # Fallback to first organic item if no perfect match found
    if not product_link:
        print("No perfect title match found. Trying first result item...")
        for item in items:
            link_el = await item.query_selector("h2 a")
            if link_el:
                href = await link_el.get_attribute("href")
                if href and "/dp/" in href:
                    product_link = f"https://www.amazon.in{href}"
                    break

    if not product_link:
        print(f"Could not find any product listing for {model} on Amazon.in.")
        await browser.close()
        return None
        
    print(f"Opening product detail page: {product_link}")
    await page.goto(product_link, timeout=30000)
    await page.wait_for_load_state("networkidle")
    
    # 1. Extract ASIN from URL
    asin_match = re.search(r'/dp/([A-Z0-9]{10})', page.url)
    asin = asin_match.group(1) if asin_match else "UNKNOWN"
    
    # 2. Extract Price
    price_val = "Out of Stock"
    price_selectors = [
        "span.a-price-whole",
        "#corePriceDisplay_desktop_feature_div span.a-price-whole",
        "#corePrice_desktop span.a-price-whole",
        ".a-color-price"
    ]
    for sel in price_selectors:
        price_el = await page.query_selector(sel)
        if price_el:
            price_text = await price_el.inner_text()
            clean_price = re.sub(r"[^\d]", "", price_text)
            if clean_price:
                price_val = clean_price
                break
                
    # 3. Extract Image URL
    image_url = None
    image_el = await page.query_selector("img#landingImage")
    if image_el:
        image_url = await image_el.get_attribute("src")
    if not image_url:
        # Fallback to secondary image finder
        img_els = await page.query_selector_all("img")
        for img in img_els:
            src = await img.get_attribute("src")
            if src and "media-amazon.com/images/I/" in src and "SL" in src:
                image_url = src
                break
                
    # 4. Extract specifications
    specs = {}
    # Check ProdDetails table
    rows = await page.query_selector_all("table.prodDetTable tr")
    for row in rows:
        label_el = await row.query_selector("th")
        val_el = await row.query_selector("td")
        if label_el and val_el:
            lbl = (await label_el.inner_text()).strip()
            val = (await val_el.inner_text()).strip()
            # Clean values
            val = re.sub(r'\s+', ' ', val)
            specs[lbl] = val
            
    # Check technical specifications
    if len(specs) < 3:
        rows2 = await page.query_selector_all("#technicalSpecifications_section_1 tr")
        for row in rows2:
            label_el = await row.query_selector("td.label")
            val_el = await row.query_selector("td.value")
            if label_el and val_el:
                lbl = (await label_el.inner_text()).strip()
                val = (await val_el.inner_text()).strip()
                val = re.sub(r'\s+', ' ', val)
                specs[lbl] = val

    # Filter top 3-4 interesting specs
    filter_keys = ["Brand", "Model", "Model Year", "Capacity", "Energy Efficiency", "Resolution", "Ram Memory Installed Size", "Operating System", "Voltage"]
    filtered_specs = {}
    for k, v in specs.items():
        if any(fk.lower() in k.lower() for fk in filter_keys):
            filtered_specs[k] = v
            if len(filtered_specs) >= 4:
                break
                
    # If filtered is empty, grab first 3-4 specs
    if not filtered_specs:
        for k, v in list(specs.items())[:4]:
            filtered_specs[k] = v

    # 5. Take screenshot of product page
    screenshot_path = f"{ARTIFACTS_DIR}/screenshot_{model.replace(' ', '_')}.png"
    await page.screenshot(path=screenshot_path, full_page=False)
    print(f"Captured screenshot to: {screenshot_path}")
    
    await browser.close()
    
    return {
        "model": model,
        "asin": asin,
        "price": price_val,
        "image_url": image_url,
        "specs": filtered_specs,
        "amazon_url": f"https://www.amazon.in/dp/{asin}",
        "screenshot": screenshot_path
    }

async def main():
    results = []
    async with async_playwright() as playwright:
        for product in PRODUCTS_TO_SEARCH:
            try:
                res = await scrape_product(product, playwright)
                if res:
                    results.append(res)
            except Exception as e:
                print(f"Error scraping {product['model']}: {e}")
                
    print("\n--- RESULTS ---")
    for r in results:
        print(f"Product: {r['model']}")
        print(f"ASIN: {r['asin']}")
        print(f"Price: {r['price']}")
        print(f"Image URL: {r['image_url']}")
        print("Specs extracted:")
        for k, v in r['specs'].items():
            print(f"  - {k}: {v}")
        print(f"Amazon URL: {r['amazon_url']}")
        print(f"Screenshot Path: {r['screenshot']}")
        print("-" * 30)

asyncio.run(main())
