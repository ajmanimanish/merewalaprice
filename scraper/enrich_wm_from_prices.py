"""
WM image enricher using EXISTING retailer URLs from online_prices table.
The price scraper already stored Croma/Amazon/Flipkart product page URLs.
We navigate to those URLs (which are confirmed working) and extract og:image.
"""
import asyncio, os
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}

async def extract_image_from_page(page, url: str, platform: str) -> str | None:
    """Visit a known retailer product URL and extract the product image."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        img = await page.evaluate("""() => {
            // og:image is the most reliable across all retailers
            const og = document.querySelector('meta[property="og:image"]');
            if (og && og.content && og.content.startsWith('http') &&
                !og.content.includes('logo') && !og.content.includes('icon') &&
                !og.content.includes('placeholder')) {
                return og.content;
            }
            // twitter:image
            const tw = document.querySelector('meta[name="twitter:image"]');
            if (tw && tw.content && tw.content.startsWith('http')) return tw.content;
            // Croma: product main image
            const cromaImg = document.querySelector('div.product-img img, div.img-section img, picture.main-image img');
            if (cromaImg) {
                const src = cromaImg.src || cromaImg.getAttribute('data-src') || '';
                if (src.startsWith('http') && !src.includes('placeholder')) return src;
            }
            return null;
        }""")

        return img
    except Exception as e:
        print(f"    Error: {e}")
        return None


async def main():
    # Get WM products with their retailer URLs from online_prices
    res = supabase.table("products").select(
        "id, brand, model_number, image_url, online_prices(platform, url, price)"
    ).eq("category", "WM").eq("is_active", True).execute()

    products = res.data or []
    print(f"=== WM Image Enricher via Retailer URLs ===")
    print(f"Total WM products: {len(products)}\n")

    # Build list of products and their retailer URLs (prefer Croma, then Flipkart, then Amazon)
    to_process = []
    no_url = []
    for p in products:
        prices = p.get("online_prices") or []
        # Sort: croma first (less blocking), then flipkart, then amazon
        platform_order = {"croma": 0, "reliance": 1, "flipkart": 2, "amazon": 3}
        prices_sorted = sorted(prices, key=lambda x: platform_order.get(x.get("platform", ""), 99))

        best_url = None
        best_platform = None
        for pr in prices_sorted:
            url = pr.get("url")
            if url and url.startswith("http"):
                best_url = url
                best_platform = pr.get("platform")
                break

        if best_url:
            to_process.append((p, best_url, best_platform))
        else:
            no_url.append(p)

    print(f"Products with retailer URLs: {len(to_process)}")
    print(f"Products without URLs (brand fallback only): {len(no_url)}")
    print()
    for p in no_url:
        print(f"  No URL: {p['brand']} {p['model_number']}")
    print()

    updated = kept = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(extra_http_headers=HEADERS, locale="en-IN")
        page = await ctx.new_page()

        for i, (p, url, platform) in enumerate(to_process):
            brand = p["brand"]
            model = p["model_number"]
            pid   = p["id"]
            print(f"[{i+1}/{len(to_process)}] {brand} {model} [{platform}]")
            print(f"  URL: {url[:70]}")

            img_url = await extract_image_from_page(page, url, platform)

            if img_url:
                supabase.table("products").update({"image_url": img_url}).eq("id", pid).execute()
                print(f"  ✓ Image saved: {img_url[:70]}\n")
                updated += 1
            else:
                print(f"  ✗ No image — brand fallback kept\n")
                kept += 1

            await asyncio.sleep(2)

        await browser.close()

    print(f"\n{'='*55}")
    print(f"✓ Model-specific images saved: {updated}")
    print(f"  Brand fallback kept:          {kept + len(no_url)}")

asyncio.run(main())
