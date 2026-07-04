"""
WM image enricher using DuckDuckGo HTML → Croma product page → og:image.
Reuses the same exact pattern as the working price scraper.
"""
import asyncio, os, urllib.parse
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}

async def get_croma_image(page, brand: str, model: str) -> str | None:
    """Find product on Croma via DuckDuckGo, then extract image."""
    q = f"site:croma.com {brand} {model} washing machine".replace(' ', '+')
    ddg_url = f"https://html.duckduckgo.com/html/?q={q}"
    print(f"  DDG: {ddg_url[:80]}")

    try:
        await page.goto(ddg_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2500)

        croma_url = await page.evaluate("""() => {
            const links = document.querySelectorAll('a.result__url, a.result__a, a[href*="croma.com"]');
            for (const a of links) {
                const href = a.href || a.getAttribute('href') || '';
                if (href.includes('croma.com') && (href.includes('/p/') || href.match(/\\/\\d{4,}/))) {
                    return href;
                }
                const text = (a.innerText || '').toLowerCase();
                if (text.includes('croma.com') && text.includes('/p/')) {
                    return 'https://' + text.trim();
                }
            }
            const allLinks = document.querySelectorAll('a[href]');
            for (const a of allLinks) {
                const href = a.getAttribute('href') || '';
                if (href.includes('croma.com/') && href.includes('/p/')) return href;
            }
            return null;
        }""")

        if not croma_url:
            print(f"  ✗ No Croma URL found via DDG")
            return None

        print(f"  Croma URL: {croma_url[:70]}")

        # Navigate to the Croma product page
        await page.goto(croma_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        # Extract product image — Croma uses og:image AND has img tags
        img_url = await page.evaluate("""() => {
            // og:image is most reliable on product pages
            const og = document.querySelector('meta[property="og:image"]');
            if (og && og.content && og.content.startsWith('http') &&
                !og.content.includes('logo') && !og.content.includes('icon')) {
                return og.content;
            }
            // Croma product image in gallery
            const galleryImg = document.querySelector(
                'img.product-img, img[class*="product"], div.img-wrapper img, ' +
                'div[class*="gallery"] img, figure img, div.product-image img'
            );
            if (galleryImg) {
                const src = galleryImg.src || galleryImg.getAttribute('data-src') || '';
                if (src.startsWith('http') && !src.includes('placeholder')) return src;
            }
            // Last resort: first large img
            const imgs = document.querySelectorAll('img');
            for (const img of imgs) {
                const src = img.src || '';
                const w = img.naturalWidth || img.width || 0;
                if (src.startsWith('http') && w > 100 &&
                    !src.includes('logo') && !src.includes('icon') &&
                    !src.includes('placeholder') && !src.includes('banner')) {
                    return src;
                }
            }
            return null;
        }""")

        if img_url:
            print(f"  ✓ Image: {img_url[:70]}")
        else:
            print(f"  ✗ No image found on Croma page")
        return img_url

    except Exception as e:
        print(f"  Error: {e}")
        return None


async def main():
    res = supabase.table("products").select("id, brand, model_number, image_url").eq("category", "WM").eq("is_active", True).execute()
    wms = res.data or []
    print(f"=== WM Croma+DDG Image Enricher ===\nProducts: {len(wms)}\n")

    updated = kept = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(extra_http_headers=HEADERS, locale="en-IN")
        page = await ctx.new_page()

        for i, p in enumerate(wms):
            brand = p["brand"]
            model = p["model_number"]
            pid   = p["id"]
            print(f"\n[{i+1}/{len(wms)}] {brand} {model}")

            img_url = await get_croma_image(page, brand, model)

            if img_url:
                supabase.table("products").update({"image_url": img_url}).eq("id", pid).execute()
                print(f"  → ✓ Saved")
                updated += 1
            else:
                print(f"  → Brand fallback kept")
                kept += 1

            await asyncio.sleep(3)  # Polite delay between DDG searches

        await browser.close()

    print(f"\n{'='*50}")
    print(f"✓ Model-specific images: {updated}  |  Brand fallback kept: {kept}")

asyncio.run(main())
