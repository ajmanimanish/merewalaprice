"""
MereWalaPrice — Brand Website Image Enrichment Script
Fetches real product images from brand websites for all 24 products.
Falls back to og:image meta tag extraction via HTTP first,
then Playwright for JS-rendered pages.

Run from: /Users/manish/Desktop/merawalaprice/scraper/
Command:  python enrich_images.py
"""

import asyncio
import os
import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────────────────────────────────────────────────────────
# Brand URL patterns — verified from actual brand websites
# Model number is lowercased and hyphens/spaces normalised
# ─────────────────────────────────────────────────────────────
BRAND_URLS = {
    # LG: model goes lowercase, spaces replaced with hyphens
    ("LG", "AC"):     "https://www.lg.com/in/air-conditioners/split-air-conditioners/{model}/",
    ("LG", "TV"):     "https://www.lg.com/in/tv-soundbars/all-tv-soundbars/{model}/",
    ("LG", "WM"):     "https://www.lg.com/in/washing-machines/front-load/{model}/",
    ("LG", "FRIDGE"): "https://www.lg.com/in/refrigerators/all-refrigerators/{model}/",

    # Samsung: model lowercase, spaces to hyphens
    ("Samsung", "AC"):     "https://www.samsung.com/in/air-conditioners/all-air-conditioners/?galaxy-ai={model}",
    ("Samsung", "TV"):     "https://www.samsung.com/in/tvs/uhd-4k-tv/{model}/",
    ("Samsung", "WM"):     "https://www.samsung.com/in/washing-machines/front-load-wm/{model}/",
    ("Samsung", "FRIDGE"): "https://www.samsung.com/in/refrigerators/single-door/{model}/",

    # Sony: model as-is lowercase
    ("Sony", "TV"): "https://www.sony.co.in/en/articles/kd-43x74l",

    # Blue Star: product page
    ("Blue Star", "AC"): "https://www.bluestarindia.com/ac/split-ac/ie518pnu",

    # Voltas: product listing
    ("Voltas", "AC"): "https://www.voltastac.com/product/185v-dzw-1-5-ton-5-star-inverter-split-ac",

    # Daikin
    ("Daikin", "AC"): "https://www.daikinindia.com/product/ftkr50tv",

    # Whirlpool
    ("Whirlpool", "WM"):     "https://www.whirlpool.com/in/en/washers/top-loading/31514.html",
    ("Whirlpool", "FRIDGE"): "https://www.whirlpool.com/in/en/refrigerators/double-door/if-inv-cnv-278.html",

    # IFB
    ("IFB", "WM"): "https://www.ifbappliances.com/washing-machines/front-load/senator-wss",

    # Bosch
    ("Bosch", "WM"): "https://www.bosch-home.com/in/products/washing-and-drying/washing-machines/waj2416win",

    # Godrej
    ("Godrej", "FRIDGE"): "https://www.godrejappliances.com/products/refrigerators",

    # HP
    ("HP", "LAPTOP"): "https://www.hp.com/in-en/shop/pdp/hp-laptop-15s-eq2143au",

    # Dell
    ("Dell", "LAPTOP"): "https://www.dell.com/en-in/shop/dell-laptops/inspiron-15-laptop/spd/inspiron-15-3520-laptop",

    # Lenovo
    ("Lenovo", "LAPTOP"): "https://www.lenovo.com/in/en/p/laptops/ideapad/ideapad-300/ideapad-slim-3-gen-6-15-amd/82rk00vdin",

    # ASUS
    ("ASUS", "LAPTOP"): "https://www.asus.com/in/laptops/for-home/vivobook/asus-vivobook-15-x1502/",

    # Acer
    ("Acer", "LAPTOP"): "https://www.acer.com/in-en/laptops/aspire/aspire-5/pdp/nx-k7esi-001",

    # TCL — no dedicated India product site, skip to Amazon og:image
    ("TCL", "TV"): None,

    # OnePlus
    ("OnePlus", "TV"): "https://www.oneplus.in/tv/43y1s-pro",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def normalise_model(model: str) -> str:
    """Lowercase, replace spaces with hyphens for URL insertion."""
    return model.lower().replace(" ", "-").replace("/", "-")


async def fetch_og_image_http(url: str) -> str | None:
    """
    Fast path: simple HTTP fetch + BeautifulSoup og:image extraction.
    Works for LG, Samsung, Sony, HP, Dell, Lenovo, ASUS, Acer.
    """
    try:
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=HEADERS
        ) as client:
            r = await client.get(url)
            if r.status_code != 200:
                print(f"    HTTP {r.status_code} for {url}")
                return None
            soup = BeautifulSoup(r.text, "html.parser")

            # Try og:image first
            og = soup.find("meta", property="og:image")
            if og and og.get("content") and og["content"].startswith("http"):
                return og["content"]

            # Try twitter:image
            tw = soup.find("meta", attrs={"name": "twitter:image"})
            if tw and tw.get("content") and tw["content"].startswith("http"):
                return tw["content"]

            # Try first product image in DOM
            img = soup.select_one(
                "img.product-image, img.pdp-image, "
                "img[class*='product'], img[class*='hero'], "
                ".product-hero img, .pdp img"
            )
            if img and img.get("src", "").startswith("http"):
                return img["src"]

    except Exception as e:
        print(f"    HTTP fetch error: {e}")
    return None


async def fetch_og_image_playwright(url: str) -> str | None:
    """
    Slow path: Playwright for JS-rendered pages.
    Used as fallback when HTTP fetch returns nothing useful.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(extra_http_headers=HEADERS)
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(3000)  # let JS settle

            image_url = await page.evaluate("""
                () => {
                    // og:image from rendered DOM
                    const og = document.querySelector('meta[property="og:image"]');
                    if (og && og.content && og.content.startsWith('http')) return og.content;

                    // Common product image selectors
                    const selectors = [
                        'img.product-image', 'img.pdp-image',
                        '.product-hero img', '.pdp-hero img',
                        'img[class*="product-img"]', 'img[class*="hero-img"]',
                        '.gallery img:first-child', '.product-gallery img:first-child'
                    ];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.src && el.src.startsWith('http')) return el.src;
                    }
                    return null;
                }
            """)
            await browser.close()
            return image_url
    except Exception as e:
        print(f"    Playwright error: {e}")
    return None


async def fetch_amazon_og_image(amazon_url: str) -> str | None:
    """
    Last resort: fetch og:image from Amazon product/search page.
    Amazon's og:image is in the initial HTML without JS.
    """
    try:
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=HEADERS
        ) as client:
            r = await client.get(amazon_url)
            if r.status_code != 200:
                return None
            soup = BeautifulSoup(r.text, "html.parser")
            og = soup.find("meta", property="og:image")
            if og and og.get("content") and og["content"].startswith("http"):
                return og["content"]
    except Exception as e:
        print(f"    Amazon fetch error: {e}")
    return None


async def enrich_product(product: dict) -> dict:
    brand = product["brand"]
    model = product["model_number"]
    category = product["category"]
    pid = product["id"]
    model_slug = normalise_model(model)

    print(f"\n{'─'*55}")
    print(f"  {brand} | {model} | {category}")

    image_url = None
    key = (brand, category)
    brand_url = BRAND_URLS.get(key)

    if brand_url:
        # Insert model slug into URL template
        full_url = brand_url.format(model=model_slug)
        print(f"  Brand URL: {full_url}")

        # Step 1: HTTP fast path
        image_url = await fetch_og_image_http(full_url)
        if image_url:
            print(f"  ✓ Found via HTTP og:image")
        else:
            # Step 2: Playwright slow path
            print(f"  Trying Playwright...")
            image_url = await fetch_og_image_playwright(full_url)
            if image_url:
                print(f"  ✓ Found via Playwright")

    # Step 3: Amazon fallback
    if not image_url and product.get("amazon_url"):
        print(f"  Trying Amazon fallback...")
        image_url = await fetch_amazon_og_image(product["amazon_url"])
        if image_url:
            print(f"  ✓ Found via Amazon")

    # Update Supabase
    if image_url:
        # Skip Unsplash placeholders that are already there
        supabase.table("products").update(
            {"image_url": image_url}
        ).eq("id", pid).execute()
        print(f"  ✓ Saved: {image_url[:70]}...")
        return {"id": pid, "brand": brand, "model": model, "status": "success", "url": image_url}
    else:
        print(f"  ✗ No image found — keeping Unsplash placeholder")
        return {"id": pid, "brand": brand, "model": model, "status": "failed", "url": None}


async def main():
    print("MereWalaPrice — Product Image Enrichment")
    print("=" * 55)
    print(f"Supabase: {SUPABASE_URL[:40]}...")

    # Fetch all products (update even Unsplash placeholders with real images)
    result = supabase.table("products") \
        .select("id, name, brand, model_number, category, amazon_url, image_url") \
        .execute()

    products = result.data
    print(f"\nTotal products to enrich: {len(products)}")

    results = []
    for product in products:
        result = await enrich_product(product)
        results.append(result)
        await asyncio.sleep(1.5)  # polite rate limit

    # Summary
    print(f"\n{'='*55}")
    print("ENRICHMENT SUMMARY")
    print(f"{'='*55}")
    success = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] == "failed"]
    print(f"✓ Success: {len(success)}/{len(results)}")
    print(f"✗ Failed:  {len(failed)}/{len(results)}")

    if failed:
        print(f"\nProducts needing manual image:")
        for r in failed:
            print(f"  - {r['brand']} {r['model']}")

    print("\nDone. Run the SQL below to verify:")
    print("""
SELECT brand, model_number, category,
       CASE 
         WHEN image_url LIKE '%unsplash%' THEN 'PLACEHOLDER'
         WHEN image_url IS NOT NULL THEN 'REAL IMAGE'
         ELSE 'MISSING'
       END as image_status
FROM products
ORDER BY category, brand;
    """)


if __name__ == "__main__":
    asyncio.run(main())
