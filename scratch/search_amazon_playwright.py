import asyncio
import re
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

search_targets = [
    {
        "label": "Blue Star IE518PNU",
        "query": "Blue Star 1.5 Ton 5 Star Inverter Split AC",
        "brand": "Blue Star",
        "model": "IE518PNU"
    },
    {
        "label": "Voltas 185V DZW",
        "query": "Voltas 1.5 Ton 5 Star Inverter Split AC 185V",
        "brand": "Voltas",
        "model": "185V DZW"
    },
    {
        "label": "LG PS-Q19YNZE",
        "query": "LG 1.5 Ton 5 Star DUAL Inverter Split AC",
        "brand": "LG",
        "model": "PS-Q19YNZE"
    },
    {
        "label": "Samsung UA43CUE60KLXL",
        "query": "Samsung 43 inch Crystal 4K Ultra HD Smart LED TV",
        "brand": "Samsung",
        "model": "UA43CUE60KLXL"
    },
    {
        "label": "Samsung WW70T4020EE",
        "query": "Samsung 7 kg 5 Star Fully Automatic Front Load Washing Machine",
        "brand": "Samsung",
        "model": "WW70T4020EE"
    }
]

async def process_target(target, playwright):
    print(f"\nProcessing {target['label']}...")
    browser = await playwright.chromium.launch(
        headless=True,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    )
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 1200}
    )
    page = await context.new_page()
    
    # 1. Search Amazon India
    search_url = f"https://www.amazon.in/s?k={urllib.parse.quote(target['query'])}" if 'urllib' in globals() else f"https://www.amazon.in/s?k={target['query'].replace(' ', '+')}"
    print(f"Searching: {search_url}")
    await page.goto(search_url, timeout=30000)
    await page.wait_for_timeout(3000)
    
    # Take screenshot of search page to diagnose CAPTCHA
    search_screen_path = f"{ARTIFACTS_DIR}/search_{target['model'].replace(' ', '_')}.png"
    await page.screenshot(path=search_screen_path)
    print(f"Saved search page screenshot to {search_screen_path}")
    
    # Check for CAPTCHA
    if "enter the characters you see below" in (await page.content()).lower():
        print("CAPTCHA detected on search results page!")
        await browser.close()
        return None
        
    # Find links
    links = await page.query_selector_all("a.a-link-normal.s-line-clamp-2, a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal")
    product_url = None
    for link in links[:5]:
        href = await link.get_attribute("href")
        title_el = await link.query_selector("span")
        title_text = await title_el.inner_text() if title_el else ""
        print(f"Found listing: {title_text[:60]}... -> {href[:40]}")
        
        # Check brand match and general characteristics
        if target['brand'].lower() in title_text.lower():
            product_url = f"https://www.amazon.in{href}"
            break
            
    if not product_url and len(links) > 0:
        href = await links[0].get_attribute("href")
        product_url = f"https://www.amazon.in{href}"
        
    if not product_url:
        print("No product links found on search results page.")
        await browser.close()
        return None
        
    print(f"Navigating to product detail page: {product_url}")
    await page.goto(product_url, timeout=30000)
    await page.wait_for_timeout(3000)
    
    # Extract details
    content = await page.content()
    if "enter the characters you see below" in content.lower():
        print("CAPTCHA detected on product detail page!")
        await browser.close()
        return None
        
    # ASIN
    asin_match = re.search(r'/dp/([A-Z0-9]{10})', page.url)
    asin = asin_match.group(1) if asin_match else "UNKNOWN"
    
    # Price
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
                
    # Image URL
    image_url = None
    image_el = await page.query_selector("img#landingImage")
    if image_el:
        image_url = await image_el.get_attribute("src")
        
    # Specs
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
                
    filtered_specs = {}
    filter_keys = ["Brand", "Model", "Model Year", "Capacity", "Energy Efficiency", "Resolution", "Ram Memory", "Operating System"]
    for k, v in specs.items():
        if any(fk.lower() in k.lower() for fk in filter_keys):
            filtered_specs[k] = re.sub(r'\s+', ' ', v)
            if len(filtered_specs) >= 4:
                break
    if not filtered_specs:
        for k, v in list(specs.items())[:4]:
            filtered_specs[k] = re.sub(r'\s+', ' ', v)
            
    # Save product page screenshot
    prod_screen_path = f"{ARTIFACTS_DIR}/screenshot_{target['model'].replace(' ', '_')}.png"
    await page.screenshot(path=prod_screen_path)
    print(f"Saved product page screenshot to {prod_screen_path}")
    
    await browser.close()
    
    return {
        "model": target['model'],
        "asin": asin,
        "price": price_val,
        "image_url": image_url,
        "specs": filtered_specs,
        "amazon_url": f"https://www.amazon.in/dp/{asin}",
        "screenshot": prod_screen_path
    }

async def main():
    async with async_playwright() as playwright:
        for t in search_targets:
            try:
                res = await process_target(t, playwright)
                if res:
                    print(f"\n--- SUCCESS: {res['model']} ---")
                    print(f"Product: {res['model']}")
                    print(f"ASIN: {res['asin']}")
                    print(f"Price: {res['price']}")
                    print(f"Image URL: {res['image_url']}")
                    print("Specs:")
                    for k, v in res['specs'].items():
                        print(f"  - {k}: {v}")
                    print(f"Amazon URL: {res['amazon_url']}")
                    print(f"Screenshot Path: {res['screenshot']}")
                else:
                    print(f"\n--- FAILED: {t['model']} (Blocked or not found) ---")
            except Exception as e:
                print(f"Error processing {t['model']}: {e}")

asyncio.run(main())
