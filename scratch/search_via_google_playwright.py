import asyncio
import re
import os
import urllib.parse
from playwright.async_api import async_playwright

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

targets = [
    {
        "model": "IE518PNU",
        "query": "Blue Star 1.5 Ton 5 Star Inverter Split AC IE518PNU Amazon India",
        "brand": "Blue Star"
    },
    {
        "model": "185V DZW",
        "query": "Voltas 1.5 Ton 5 Star Inverter Split AC 185V DZW Amazon India",
        "brand": "Voltas"
    },
    {
        "model": "PS-Q19YNZE",
        "query": "LG 1.5 Ton 5 Star AI DUAL Inverter Split AC PS-Q19YNZE Amazon India",
        "brand": "LG"
    },
    {
        "model": "UA43CUE60KLXL",
        "query": "Samsung 43 inch Crystal 4K iSmart TV UA43CUE60AKLXL Amazon India",
        "brand": "Samsung"
    },
    {
        "model": "WW70T4020EE",
        "query": "Samsung 7 kg 5 Star Front Load Washing Machine WW70T4020EE Amazon India",
        "brand": "Samsung"
    }
]

async def get_amazon_link_from_google(page, query, brand):
    google_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
    print(f"Searching Google: {google_url}")
    await page.goto(google_url, timeout=30000)
    await page.wait_for_timeout(3000)
    
    # Extract links
    links = await page.query_selector_all("a")
    amazon_links = []
    for link in links:
        href = await link.get_attribute("href")
        if href and "amazon.in" in href and ("/dp/" in href or "/gp/" in href):
            # Clean URL
            m = re.search(r'(https://www\.amazon\.in/dp/[A-Z0-9]{10}|https://www\.amazon\.in/[^/]+/dp/[A-Z0-9]{10})', href)
            if m:
                amazon_links.append(m.group(1))
            else:
                amazon_links.append(href)
                
    if amazon_links:
        # Prioritize links containing the brand name
        for al in amazon_links:
            if brand.lower().replace(" ", "") in al.lower():
                return al
        return amazon_links[0]
    return None

async def process_target(t, playwright):
    print(f"\n======================================")
    print(f"Processing {t['model']}...")
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
    
    # 1. Get Amazon URL from Google
    amazon_url = await get_amazon_link_from_google(page, t['query'], t['brand'])
    if not amazon_url:
        print(f"Could not find any Amazon India link on Google for {t['model']}.")
        await browser.close()
        return None
        
    print(f"Direct Amazon URL: {amazon_url}")
    
    # 2. Go to direct Amazon URL
    await page.goto(amazon_url, timeout=30000)
    await page.wait_for_timeout(3000)
    
    # Take screenshot of page to check if CAPTCHA or details loaded
    content = await page.content()
    if "enter the characters you see below" in content.lower():
        print("CAPTCHA detected on product page!")
        # Let's save a captcha screenshot just in case
        await page.screenshot(path=f"{ARTIFACTS_DIR}/captcha_{t['model']}.png")
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
        
    # Extract specs
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
    prod_screen_path = f"{ARTIFACTS_DIR}/screenshot_{t['model'].replace(' ', '_')}.png"
    await page.screenshot(path=prod_screen_path)
    print(f"Saved product page screenshot to {prod_screen_path}")
    
    await browser.close()
    
    return {
        "model": t['model'],
        "asin": asin,
        "price": price_val,
        "image_url": image_url,
        "specs": filtered_specs,
        "amazon_url": f"https://www.amazon.in/dp/{asin}",
        "screenshot": prod_screen_path
    }

async def main():
    async with async_playwright() as playwright:
        for t in targets:
            try:
                res = await process_target(t, playwright)
                if res:
                    print(f"\nResult for {res['model']}:")
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
                    print(f"\nFailed to process {t['model']}")
            except Exception as e:
                print(f"Error processing {t['model']}: {e}")

asyncio.run(main())
