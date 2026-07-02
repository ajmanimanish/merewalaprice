import asyncio
import re
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

targets = [
    {
        "model_in_db": "IE518PNU",
        "search_query": "IE518PNU",
        "brand": "Blue Star",
        "category": "AC",
        "direct_asin": "B0F6CFJF78",
        "match_keywords": ["ie518pnu"]
    },
    {
        "model_in_db": "185V DZW",
        "search_query": "Voltas 185V DZW",
        "brand": "Voltas",
        "category": "AC",
        "direct_asin": "B0CWVDN3HZ",
        "match_keywords": ["185v"]
    },
    {
        "model_in_db": "PS-Q19YNZE",
        "search_query": "PS-Q19YNZE",
        "brand": "LG",
        "category": "AC",
        "direct_asin": "B0GWMMD2DT",
        "match_keywords": ["q19ynze", "ynze"]
    },
    {
        "model_in_db": "UA43CUE60KLXL",
        "search_query": "UA43CUE60KLXL",
        "brand": "Samsung",
        "category": "TV",
        "direct_asin": "B0GXB76VRW",  # Use the active replacement model UA43UE86AHULXL
        "match_keywords": ["ue86ah", "crystal"]
    },
    {
        "model_in_db": "WW70T4020EE",
        "search_query": "WW70FG4S02AXTL",
        "brand": "Samsung",
        "category": "WM",
        "direct_asin": "B0GX9P1BWT",
        "match_keywords": ["ww70fg4s02a"]
    }
]

async def scrape_target(t, playwright):
    print(f"\n======================================")
    print(f"Scraping {t['brand']} {t['model_in_db']}...")
    
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 1200}
    )
    page = await context.new_page()
    
    product_link = f"https://www.amazon.in/dp/{t['direct_asin']}"
    print(f"Direct ASIN detected. Opening: {product_link}")
    
    await page.goto(product_link, timeout=30000)
    await page.wait_for_timeout(3000)
    
    content2 = await page.content()
    if "enter the characters you see below" in content2.lower():
        print("CAPTCHA blocked product page!")
        await browser.close()
        return None
        
    # Extract ASIN
    asin_match = re.search(r'/dp/([A-Z0-9]{10})', page.url)
    asin = asin_match.group(1) if asin_match else "UNKNOWN"
    
    # Extract title
    title_text = ""
    title_el = await page.query_selector("span#productTitle")
    if title_el:
        title_text = (await title_el.inner_text()).strip()
        
    # Extract Specs
    specs = {}
    rows = await page.query_selector_all("table.prodDetTable tr")
    for row in rows:
        label_el = await row.query_selector("th")
        val_el = await row.query_selector("td")
        if label_el and val_el:
            lbl = (await label_el.inner_text()).strip()
            val = (await val_el.inner_text()).strip()
            specs[lbl] = val
            
    if len(specs) < 3:
        rows2 = await page.query_selector_all("#technicalSpecifications_section_1 tr")
        for row in rows2:
            label_el = await row.query_selector("td.label")
            val_el = await row.query_selector("td.value")
            if label_el and val_el:
                lbl = (await label_el.inner_text()).strip()
                val = (await val_el.inner_text()).strip()
                specs[lbl] = val
                
    # Extract Prices
    deal_price = "None"
    deal_selectors = [
        "#corePriceDisplay_desktop_feature_div span.a-price-whole",
        "#corePrice_desktop span.a-price-whole",
        "span.a-price-whole",
        ".a-color-price"
    ]
    for sel in deal_selectors:
        price_el = await page.query_selector(sel)
        if price_el:
            price_text = await price_el.inner_text()
            # Clean decimals
            if "." in price_text:
                price_text = price_text.split(".")[0]
            clean_price = re.sub(r"[^\d]", "", price_text)
            if clean_price:
                deal_price = clean_price
                break
                
    regular_price = "None"
    regular_selectors = [
        "span.a-price.a-text-price span.a-offscreen",
        "span.a-price.a-text-price",
        "span.basisPrice span.a-offscreen",
        "span.a-size-small.a-color-secondary.a-text-strike",
        "#corePriceDisplay_desktop_feature_div span.a-text-strike",
        "#basisPrice",
        ".basisPrice"
    ]
    for sel in regular_selectors:
        price_el = await page.query_selector(sel)
        if price_el:
            price_text = await price_el.inner_text()
            if "." in price_text:
                price_text = price_text.split(".")[0]
            clean_price = re.sub(r"[^\d]", "", price_text)
            if clean_price:
                # Must be greater than or equal to deal price (ensures we don't grab EMI text)
                if deal_price != "None" and int(clean_price) >= int(deal_price):
                    regular_price = clean_price
                    break
                elif deal_price == "None":
                    regular_price = clean_price
                    break
                
    if regular_price == "None":
        regular_price = deal_price
        
    # Extract Image URL
    image_url = None
    image_el = await page.query_selector("img#landingImage")
    if image_el:
        image_url = await image_el.get_attribute("src")
        
    # Filter specs
    filtered_specs = {}
    filter_keys = ["Brand", "Model", "Model Year", "Capacity", "Energy Efficiency", "Resolution", "Ram Memory", "Operating System", "Item Weight", "Wattage"]
    for k, v in specs.items():
        if any(fk.lower() in k.lower() for fk in filter_keys):
            filtered_specs[k] = re.sub(r'\s+', ' ', v)
            if len(filtered_specs) >= 4:
                break
    if not filtered_specs:
        for k, v in list(specs.items())[:4]:
            filtered_specs[k] = re.sub(r'\s+', ' ', v)
            
    # Capture Screenshot
    screenshot_path = f"{ARTIFACTS_DIR}/screenshot_{t['model_in_db'].replace(' ', '_')}.png"
    await page.screenshot(path=screenshot_path)
    print(f"Captured screenshot to: {screenshot_path}")
    
    await browser.close()
    
    return {
        "model_in_db": t['model_in_db'],
        "model_found": title_text,
        "asin": asin,
        "deal_price": deal_price,
        "regular_price": regular_price,
        "image_url": image_url,
        "specs": filtered_specs,
        "amazon_url": f"https://www.amazon.in/dp/{asin}",
        "screenshot": screenshot_path
    }

async def main():
    async with async_playwright() as playwright:
        results = []
        for t in targets:
            try:
                res = await scrape_target(t, playwright)
                if res:
                    results.append(res)
                else:
                    print(f"Failed to process {t['model_in_db']}")
            except Exception as e:
                print(f"Error processing {t['model_in_db']}: {e}")
                
        print("\n--- ROBUST SCRAPE V2 RESULTS ---")
        for res in results:
            print(f"Product: {res['model_in_db']}")
            print(f"Found Model/Title: {res['model_found'][:100]}")
            print(f"ASIN: {res['asin']}")
            print(f"Deal Price: ₹{res['deal_price']}")
            print(f"Regular Price: ₹{res['regular_price']}")
            print(f"Image URL: {res['image_url']}")
            print("Specs extracted:")
            for k, v in res['specs'].items():
                print(f"  - {k}: {v}")
            print(f"Amazon URL: {res['amazon_url']}")
            print(f"Screenshot Path: {res['screenshot']}")
            print("-" * 30)

asyncio.run(main())
