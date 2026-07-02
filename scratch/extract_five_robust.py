import asyncio
import re
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

targets = [
    {
        "model": "IE518PNU",
        "search_term": "Blue Star 1.5 Ton 5 Star Inverter Split AC",
        "brand": "Blue Star"
    },
    {
        "model": "185V DZW",
        "search_term": "Voltas 1.5 Ton 5 Star Inverter Split AC",
        "brand": "Voltas"
    },
    {
        "model": "PS-Q19YNZE",
        "search_term": "LG 1.5 Ton 5 Star Inverter Split AC",
        "brand": "LG"
    },
    {
        "model": "UA43CUE60KLXL",
        "search_term": "Samsung 43 inch 4K Ultra HD Smart TV",
        "brand": "Samsung"
    },
    {
        "model": "WW70T4020EE",
        "search_term": "Samsung 7 kg 5 Star Front Load Washing Machine",
        "brand": "Samsung"
    }
]

def is_match(text, t):
    text_lower = text.lower()
    
    # Brand match is mandatory
    if t['brand'].lower() not in text_lower:
        return False
        
    # Model-specific matching details
    if t['model'] in ["IE518PNU", "185V DZW", "PS-Q19YNZE"]:
        # Must be 1.5 Ton
        if "1.5" not in text_lower or "ton" not in text_lower:
            return False
        # Must be 5 Star
        if "5 star" not in text_lower and "5-star" not in text_lower and "5star" not in text_lower:
            return False
    elif t['model'] == "UA43CUE60KLXL":
        # Must be 43 inch TV
        if "43" not in text_lower:
            return False
        if "tv" not in text_lower and "television" not in text_lower:
            return False
    elif t['model'] == "WW70T4020EE":
        # Must be 7 kg Front Load Washing Machine
        if "7" not in text_lower or "kg" not in text_lower:
            return False
        if "front" not in text_lower:
            return False
            
    return True

async def scrape_target(t, playwright):
    print(f"\n======================================")
    print(f"Scraping {t['brand']} {t['model']}...")
    
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 1200}
    )
    page = await context.new_page()
    
    search_url = f"https://www.amazon.in/s?k={t['search_term'].replace(' ', '+')}"
    print(f"Searching Amazon.in: {search_url}")
    await page.goto(search_url, timeout=30000)
    await page.wait_for_timeout(3000)
    
    content = await page.content()
    if "enter the characters you see below" in content.lower():
        print("CAPTCHA blocked search page!")
        await browser.close()
        return None
        
    items = await page.query_selector_all(".s-result-item")
    product_link = None
    
    for item in items:
        text = await item.inner_text()
        if not text:
            continue
            
        # Run matches check
        if is_match(text, t):
            # Check price to avoid accessories
            price_el = await item.query_selector(".a-price-whole")
            if price_el:
                price_text = await price_el.inner_text()
                clean_price = int(re.sub(r"[^\d]", "", price_text) or "0")
                if clean_price < 10000:
                    continue
            else:
                # If no price is displayed, it might be out of stock, but still check if it's the appliance
                if "accessory" in text.lower() or "remote" in text.lower() or "cover" in text.lower():
                    continue
                    
            # Find the link inside this item
            links = await item.query_selector_all("a")
            for link in links:
                href = await link.get_attribute("href")
                if href and "/dp/" in href:
                    product_link = f"https://www.amazon.in{href}"
                    break
            if product_link:
                break
                
    if not product_link:
        print("No matching product found in search results.")
        await browser.close()
        return None
        
    print(f"Matching Product Detail URL: {product_link}")
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
    
    # Extract Price
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
                
    # Extract Image URL
    image_url = None
    image_el = await page.query_selector("img#landingImage")
    if image_el:
        image_url = await image_el.get_attribute("src")
        
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
    screenshot_path = f"{ARTIFACTS_DIR}/screenshot_{t['model'].replace(' ', '_')}.png"
    await page.screenshot(path=screenshot_path)
    print(f"Captured screenshot to: {screenshot_path}")
    
    await browser.close()
    
    return {
        "model": t['model'],
        "asin": asin,
        "price": price_val,
        "image_url": image_url,
        "specs": filtered_specs,
        "amazon_url": f"https://www.amazon.in/dp/{asin}",
        "screenshot": screenshot_path
    }

async def main():
    async with async_playwright() as playwright:
        for t in targets:
            try:
                res = await scrape_target(t, playwright)
                if res:
                    print(f"\nProduct: {res['model']}")
                    print(f"ASIN: {res['asin']}")
                    print(f"Price: {res['price']}")
                    print(f"Image URL: {res['image_url']}")
                    print("Specs extracted:")
                    for k, v in res['specs'].items():
                        print(f"  - {k}: {v}")
                    print(f"Amazon URL: {res['amazon_url']}")
                    print(f"Screenshot Path: {res['screenshot']}")
                else:
                    print(f"\nFailed to process {t['model']}")
            except Exception as e:
                print(f"Error processing {t['model']}: {e}")

asyncio.run(main())
