"""
Croma + Reliance Digital price scraper using network request interception.
When the page loads, we intercept the XHR/fetch API calls that contain product data.
This bypasses the SPA rendering problem entirely.
"""
import asyncio
import json
import os
import re
import datetime
from playwright.async_api import async_playwright, Page

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
MODELS_FILE   = "/Users/manish/Desktop/merawalaprice/scratch/popular_50_models.json"
PROGRESS_FILE = f"{ARTIFACTS_DIR}/price_data_progress.json"

def load_models():
    with open(MODELS_FILE, 'rb') as f:
        raw = f.read()
    content = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw.decode('utf-8'))
    return json.loads(content)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}

def save_progress(data):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def clean_price(text):
    if not text:
        return None
    text = str(text).replace('₹','').replace('Rs','').replace(',','').strip()
    m = re.search(r'\b(\d{4,7})\b', text)
    if m:
        val = int(m.group(1))
        if 1000 <= val <= 500000:
            return val
    return None

def normalize(s):
    return re.sub(r'[\s\-_]', '', str(s)).lower()

async def scrape_croma_intercept(page: Page, model: str, brand: str) -> dict:
    """Use network interception to capture Croma's internal API response."""
    result = {"price": None, "url": None, "title": None}
    captured_data = []

    def handle_response(response):
        url = response.url
        # Croma API endpoints typically contain 'api' or 'search' in URL and return JSON
        if any(x in url for x in ['croma.com/api', 'croma.com/search', 'algolia', 'hybris']):
            captured_data.append(url)

    async def handle_response_async(response):
        url = response.url
        if any(x in url for x in ['/api/', 'search', 'product', 'plp', 'catalog']):
            try:
                ct = response.headers.get('content-type', '')
                if 'json' in ct:
                    body = await response.json()
                    captured_data.append({"url": url, "body": body})
            except:
                pass

    page.on("response", lambda r: asyncio.ensure_future(handle_response_async(r)))

    try:
        q = f"{brand}+{model}".replace(' ', '+')
        await page.goto(f"https://www.croma.com/search/?q={q}&suggestedSearch=true", 
                       wait_until="networkidle", timeout=40000)
        await page.wait_for_timeout(4000)

        # Check captured API data
        for item in captured_data:
            if isinstance(item, dict) and 'body' in item:
                body = item['body']
                body_str = json.dumps(body).lower()
                brand_l = brand.lower().replace(' ', '')
                if brand_l in body_str or normalize(model) in body_str:
                    # Try to extract price from JSON structure
                    price = extract_price_from_json(body, brand, model)
                    if price:
                        result = {"price": price, "url": item['url'], "title": f"{brand} {model}"}
                        break

        # Fallback: try scraping the rendered page after networkidle
        if not result['price']:
            price_text = await page.evaluate("""() => {
                // After networkidle, try harder to find prices
                const allText = document.body.innerText;
                const matches = allText.match(/₹\\s*[\\d,]+/g) || [];
                // Filter for realistic appliance prices (₹10,000 - ₹2,00,000)
                return matches.filter(m => {
                    const n = parseInt(m.replace(/[₹,\\s]/g,''));
                    return n >= 10000 && n <= 200000;
                }).slice(0, 5);
            }""")
            if price_text:
                price = clean_price(price_text[0])
                if price:
                    result = {"price": price, "url": page.url, "title": f"{brand} {model}"}

    except Exception as e:
        print(f"  [Croma] Error: {e}")
    return result

def extract_price_from_json(data, brand, model):
    """Recursively search JSON for a price near brand/model mention."""
    data_str = json.dumps(data)
    # Look for price fields
    price_patterns = [
        r'"price":\s*"?([\d.]+)"?',
        r'"finalPrice":\s*"?([\d.]+)"?',
        r'"sellingPrice":\s*"?([\d.]+)"?',
        r'"discountedPrice":\s*"?([\d.]+)"?',
        r'"mrp":\s*"?([\d.]+)"?',
    ]
    for pattern in price_patterns:
        matches = re.findall(pattern, data_str)
        for m in matches:
            val = float(m)
            if 5000 <= val <= 500000:
                return int(val)
    return None

async def scrape_reliance_intercept(page: Page, model: str, brand: str) -> dict:
    """Intercept Reliance Digital API calls."""
    result = {"price": None, "url": None, "title": None}
    captured_data = []

    async def handle_response_async(response):
        url = response.url
        if any(x in url for x in ['/api/', 'product', 'search', 'catalog', 'solr']):
            try:
                ct = response.headers.get('content-type', '')
                if 'json' in ct:
                    body = await response.json()
                    captured_data.append({"url": url, "body": body})
            except:
                pass

    page.on("response", lambda r: asyncio.ensure_future(handle_response_async(r)))

    try:
        q = f"{brand} {model}".replace(' ', '+')
        await page.goto(f"https://www.reliancedigital.in/search?q={q}",
                       wait_until="networkidle", timeout=40000)
        await page.wait_for_timeout(4000)

        for item in captured_data:
            if isinstance(item, dict) and 'body' in item:
                body = item['body']
                body_str = json.dumps(body).lower()
                brand_l = brand.lower()
                if brand_l in body_str:
                    price = extract_price_from_json(body, brand, model)
                    if price:
                        result = {"price": price, "url": item['url'], "title": f"{brand} {model}"}
                        break

        # Fallback after networkidle
        if not result['price']:
            price_text = await page.evaluate("""() => {
                const allText = document.body.innerText;
                const matches = allText.match(/₹\\s*[\\d,]+/g) || [];
                return matches.filter(m => {
                    const n = parseInt(m.replace(/[₹,\\s]/g,''));
                    return n >= 10000 && n <= 200000;
                }).slice(0, 5);
            }""")
            if price_text:
                price = clean_price(price_text[0])
                if price:
                    result = {"price": price, "url": page.url, "title": f"{brand} {model}"}

    except Exception as e:
        print(f"  [Reliance] Error: {e}")
    return result


async def main():
    """
    Second-pass scraper: only fills in Croma + Reliance prices
    for models already in progress that are missing those.
    Merges results back into the progress file.
    """
    models = load_models()
    progress = load_progress()

    # Only process models that are already in progress (scraped by main scraper)
    # but missing Croma/Reliance prices
    to_process = []
    for m in models:
        key = f"{m['brand']}_{m['model']}"
        if key in progress:
            rec = progress[key]
            if not rec['prices'].get('croma', {}).get('price') or \
               not rec['prices'].get('reliance', {}).get('price'):
                to_process.append((key, m))

    print(f"Models needing Croma/Reliance fill-in: {len(to_process)}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN",
            timezone_id="Asia/Kolkata"
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await ctx.new_page()

        for i, (key, m) in enumerate(to_process):
            print(f"\n[{i+1}/{len(to_process)}] {m['brand']} {m['model']}")

            if not progress[key]['prices'].get('croma', {}).get('price'):
                print(f"  → Croma (intercept)...")
                cr = await scrape_croma_intercept(page, m['model'], m['brand'])
                progress[key]['prices']['croma'] = cr
                print(f"     {'₹'+str(cr['price']) if cr['price'] else 'Not found'}")
                await asyncio.sleep(2)

            if not progress[key]['prices'].get('reliance', {}).get('price'):
                print(f"  → Reliance (intercept)...")
                rd = await scrape_reliance_intercept(page, m['model'], m['brand'])
                progress[key]['prices']['reliance'] = rd
                print(f"     {'₹'+str(rd['price']) if rd['price'] else 'Not found'}")
                await asyncio.sleep(2)

            save_progress(progress)
            print(f"  ✓ Saved")

        await browser.close()

    print(f"\n✅ Done! Croma/Reliance pass complete.")

if __name__ == "__main__":
    asyncio.run(main())
