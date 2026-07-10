import asyncio
import json
import os
import re
import datetime
from playwright.async_api import async_playwright, Page
from supabase import create_client
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv("/Users/manish/Desktop/merawalaprice/scraper/.env")

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

INSTALL_COST = {"AC": 1200, "WM": 600, "FRIDGE": 0, "TV": 0, "LAPTOP": 0}

# Price sanity floors/ceilings — reject anything outside these
PRICE_FLOOR = {"AC": 18000, "FRIDGE": 7000, "WM": 8000, "TV": 8000, "LAPTOP": 15000}
PRICE_CEIL  = {"AC": 200000, "FRIDGE": 200000, "WM": 100000, "TV": 350000, "LAPTOP": 300000}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

OUTPUT_FILE = "/Users/manish/Desktop/merawalaprice/scraper/price_results.json"

# ── Helpers ───────────────────────────────────────────────────────────────────
def clean_price(text: str, category: str = "AC") -> int | None:
    if not text:
        return None
    text = str(text).replace("₹", "").replace("Rs", "").replace(",", "").strip()
    m = re.search(r"\b(\d{4,7})\b", text)
    if not m:
        return None
    val = int(m.group(1))
    floor = PRICE_FLOOR.get(category, 5000)
    ceil  = PRICE_CEIL.get(category, 500000)
    return val if floor <= val <= ceil else None


def model_in_title(model: str, title: str) -> bool:
    """Check if the model number appears in the product title."""
    m = model.lower().replace(" ", "").replace("-", "").replace("_", "")
    t = title.lower().replace(" ", "").replace("-", "").replace("_", "")
    # Check full model or at least 6+ char prefix
    return m in t or (len(m) >= 6 and m[:6] in t)


# ── Amazon scraper ─────────────────────────────────────────────────────────────
async def scrape_amazon(page: Page, product: dict) -> dict:
    """
    For Amazon: use ASIN for direct product page (100% accurate URL).
    If no ASIN: search by model number and verify title match.
    """
    result = {"price": None, "url": None}
    category = product.get("category", "AC")
    model = product["model_number"]
    asin = product.get("asin")

    try:
        if asin:
            # Direct product page — guaranteed correct product
            url = f"https://www.amazon.in/dp/{asin}"
            print(f"    [Amazon] Direct ASIN: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)
        else:
            # Search by exact model number
            search_url = f"https://www.amazon.in/s?k={model.replace(' ', '+')}"
            print(f"    [Amazon] Search: {search_url}")
            await page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)

            # Find first result with model in title
            items = await page.query_selector_all(".s-result-item[data-component-type='s-search-result']")
            product_url = None
            for item in items[:6]:
                title_el = await item.query_selector("h2 a span")
                if not title_el:
                    continue
                title = await title_el.inner_text()
                if model_in_title(model, title):
                    link = await item.query_selector("h2 a")
                    href = await link.get_attribute("href") if link else None
                    if href:
                        product_url = f"https://www.amazon.in{href}" if href.startswith("/") else href
                        break

            if not product_url:
                print(f"    [Amazon] No exact model match in search")
                return result

            await page.goto(product_url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)
            url = page.url

        # Extract ASIN from current URL
        asin_match = re.search(r"/dp/([A-Z0-9]{10})", page.url)
        found_asin = asin_match.group(1) if asin_match else asin

        # Check for CAPTCHA
        content = await page.content()
        if "enter the characters" in content.lower() or "robot" in content.lower() or "captcha" in content.lower():
            print(f"    [Amazon] CAPTCHA detected! Please solve it in the browser window...")
            for _ in range(30):
                await page.wait_for_timeout(2000)
                content = await page.content()
                if "enter the characters" not in content.lower() and "robot" not in content.lower() and "captcha" not in content.lower():
                    print("    [Amazon] CAPTCHA solved!")
                    break

        # Extract price
        price_text = None
        for selector in [
            "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
            "#corePrice_desktop .a-offscreen",
            ".a-price .a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
            ".reinventPricePriceToPayMargin .a-offscreen",
        ]:
            el = await page.query_selector(selector)
            if el:
                price_text = await el.inner_text()
                val = clean_price(price_text, category)
                if val:
                    clean_url = f"https://www.amazon.in/dp/{found_asin}" if found_asin else page.url
                    print(f"    [Amazon] ₹{val:,} → {clean_url}")
                    return {"price": val, "url": clean_url, "asin": found_asin}

        print(f"    [Amazon] Price not found on page")

    except Exception as e:
        print(f"    [Amazon] Error: {e}")

    return result


# ── Flipkart scraper ───────────────────────────────────────────────────────────
async def scrape_flipkart(page: Page, product: dict) -> dict:
    """Search Flipkart by exact model number, verify match, return product page URL."""
    result = {"price": None, "url": None}
    category = product.get("category", "AC")
    model = product["model_number"]

    try:
        search_url = f"https://www.flipkart.com/search?q={model.replace(' ', '+')}"
        print(f"    [Flipkart] Search: {search_url}")
        await page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)

        # Check for CAPTCHA / block page
        content = await page.content()
        if "captcha" in content.lower() or "robot" in content.lower() or "blocked" in content.lower() or "verify you are" in content.lower():
            print(f"    [Flipkart] Verification block detected! Please verify in browser...")
            for _ in range(30):
                await page.wait_for_timeout(2000)
                content = await page.content()
                if "captcha" not in content.lower() and "robot" not in content.lower() and "blocked" not in content.lower() and "verify you are" not in content.lower():
                    print("    [Flipkart] Verification solved!")
                    break

        # Find product cards
        product_url = None
        cards = await page.query_selector_all("div[data-id], ._1AtVbE, .tUxRFH")
        for card in cards[:5]:
            # Get title
            title_el = await card.query_selector("a.IRpwTa, a.s1Q9rs, a.WKTcLC, a[class*='title']")
            if not title_el:
                title_el = await card.query_selector("a")
            if not title_el:
                continue
            title = await title_el.get_attribute("title") or await title_el.inner_text()

            if model_in_title(model, title):
                href = await title_el.get_attribute("href")
                if href:
                    product_url = f"https://www.flipkart.com{href}" if href.startswith("/") else href
                    break

        # Fallback: first result if no exact match
        if not product_url:
            first_link = await page.query_selector("a._1fQZEK, a.IRpwTa, a.s1Q9rs, a.WKTcLC")
            if first_link:
                href = await first_link.get_attribute("href")
                if href:
                    product_url = f"https://www.flipkart.com{href}" if href.startswith("/") else href

        if not product_url:
            print(f"    [Flipkart] No product found")
            return result

        await page.goto(product_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        url = page.url

        # Extract price — walk leaf text nodes for ₹XXXXX pattern
        price = await page.evaluate("""() => {
            function* walkText(node) {
                if (node.nodeType === 3) yield node.textContent;
                else for (const c of node.childNodes) yield* walkText(c);
            }
            for (const t of walkText(document.body)) {
                const s = t.trim();
                if (/^₹[\\d,]{4,8}$/.test(s)) {
                    const n = parseInt(s.replace(/[^\\d]/g, ''));
                    if (n >= 5000 && n <= 500000) return n;
                }
            }
            return null;
        }""")

        val = clean_price(str(price), category) if price else None
        if val:
            print(f"    [Flipkart] ₹{val:,} → {url}")
            return {"price": val, "url": url}

        print(f"    [Flipkart] Price not found on page")

    except Exception as e:
        print(f"    [Flipkart] Error: {e}")

    return result


# ── Croma scraper ─────────────────────────────────────────────────────────────
async def scrape_croma(page: Page, product: dict) -> dict:
    """Search Croma by model number, extract price from product page."""
    result = {"price": None, "url": None}
    category = product.get("category", "AC")
    model = product["model_number"]

    try:
        search_url = f"https://www.croma.com/searchB?q={model.replace(' ', '%20')}"
        print(f"    [Croma] Search: {search_url}")
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        # Find first product link
        product_url = None
        links = await page.query_selector_all("a[href*='/p/']")
        for link in links[:5]:
            href = await link.get_attribute("href")
            if href and "/p/" in href:
                product_url = f"https://www.croma.com{href}" if href.startswith("/") else href
                break

        if not product_url:
            print(f"    [Croma] No product found")
            return result

        await page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)
        url = page.url

        # Extract price
        for selector in ["span.amount", ".pdpPrice", "[class*='price'] span", ".cp-price"]:
            el = await page.query_selector(selector)
            if el:
                text = await el.inner_text()
                val = clean_price(text, category)
                if val:
                    print(f"    [Croma] ₹{val:,} → {url}")
                    return {"price": val, "url": url}

        print(f"    [Croma] Price not found")

    except Exception as e:
        print(f"    [Croma] Error: {e}")

    return result


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    print("MeraWalaPrice — Complete Price Fix")
    print("=" * 60)

    # Fetch all active products from Supabase
    result = supabase.table("products").select(
        "id, name, brand, model_number, category, asin, amazon_url, flipkart_url"
    ).eq("is_active", True).execute()

    products = result.data
    print(f"Found {len(products)} active products in Supabase\n")

    # Load previous results if they exist (resume-safe)
    results = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            saved = json.load(f)
            results = {p["product_id"]: p for p in saved}
        print(f"Resuming — {len(results)} already done\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            viewport={"width": 1280, "height": 900},
            locale="en-IN",
        )
        page = await context.new_page()

        for i, product in enumerate(products):
            pid = product["id"]
            model = product["model_number"]
            brand = product["brand"]
            category = product["category"]

            # Skip if already done
            if pid in results:
                print(f"[{i+1}/{len(products)}] SKIP {brand} {model} (already done)")
                continue

            print(f"\n[{i+1}/{len(products)}] {brand} {model} ({category})")
            print(f"{'─'*55}")

            install = INSTALL_COST.get(category, 0)

            # Scrape all 3 platforms
            amz  = await scrape_amazon(page, product)
            await asyncio.sleep(2)
            fk   = await scrape_flipkart(page, product)
            await asyncio.sleep(2)
            cr   = await scrape_croma(page, product)
            await asyncio.sleep(2)

            # Save to Supabase immediately
            for platform, data in [("amazon", amz), ("flipkart", fk), ("croma", cr)]:
                if data["price"]:
                    supabase.table("online_prices").upsert({
                        "product_id": pid,
                        "platform": platform,
                        "price": data["price"],
                        "installation_cost": install,
                        "true_cost": data["price"] + install,
                        "url": data["url"],
                        "fetch_status": "success",
                        "fetched_at": datetime.datetime.now().isoformat()
                    }, on_conflict="product_id,platform").execute()

            # Update ASIN in products table if found
            found_asin = amz.get("asin") or product.get("asin")
            if found_asin and found_asin != product.get("asin"):
                supabase.table("products").update({
                    "asin": found_asin,
                    "amazon_url": f"https://www.amazon.in/dp/{found_asin}"
                }).eq("id", pid).execute()

            # Save progress
            results[pid] = {
                "product_id": pid,
                "brand": brand,
                "model": model,
                "category": category,
                "amazon":   amz,
                "flipkart": fk,
                "croma":    cr,
                "done_at": datetime.datetime.now().isoformat()
            }
            with open(OUTPUT_FILE, "w") as f:
                json.dump(list(results.values()), f, indent=2, ensure_ascii=False)

            # Cooldown every 10 products
            if (i + 1) % 10 == 0:
                print(f"\n── Cooldown 10s ──\n")
                await asyncio.sleep(10)

        await browser.close()

    # Final summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    total = len(results)
    amz_found = sum(1 for r in results.values() if r["amazon"].get("price"))
    fk_found  = sum(1 for r in results.values() if r["flipkart"].get("price"))
    cr_found  = sum(1 for r in results.values() if r["croma"].get("price"))
    print(f"Total processed: {total}")
    print(f"Amazon prices:   {amz_found}/{total}")
    print(f"Flipkart prices: {fk_found}/{total}")
    print(f"Croma prices:    {cr_found}/{total}")

    # Products with no prices at all
    missing = [r for r in results.values()
               if not r["amazon"].get("price") and not r["flipkart"].get("price")]
    if missing:
        print(f"\nProducts with NO prices ({len(missing)}):")
        for r in missing:
            print(f"  ✗ {r['brand']} {r['model']}")

    print(f"\nResults saved to: {OUTPUT_FILE}")
    print("\nAll prices have been saved to Supabase directly.")


if __name__ == "__main__":
    asyncio.run(main())
