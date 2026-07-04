"""
WM-specific image enricher using Playwright — searches Amazon with brand+model,
validates result is a WASHING MACHINE (not a spare part), saves model-specific image.
"""
import asyncio, os, urllib.parse
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"}

# Words that confirm a listing IS a washing machine
WM_KEYWORDS = {"washing machine", "washer", "front load", "top load", "kg", "rpm", "laundry"}
# Words that disqualify a listing (spare parts, accessories)
BLOCK_KEYWORDS = {"pump", "drain", "gasket", "seal", "bearing", "belt", "drum spider",
                  "heater", "door hinge", "knob", "filter", "remote", "cover", "tub",
                  "motor", "carbon brush", "capacitor", "inlet valve"}

async def search_amazon_wm(page, brand: str, model: str):
    query = f"{brand} {model} washing machine"
    url = f"https://www.amazon.in/s?k={urllib.parse.quote(query)}"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)

        result = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.s-main-slot .s-result-item[data-component-type="s-search-result"]');
                for (const item of items) {
                    const link = item.querySelector('h2 a.a-link-normal');
                    const img  = item.querySelector('img.s-image');
                    if (!link || !link.href) continue;
                    const title = (link.innerText || link.textContent || '').toLowerCase();
                    return { title, href: link.href, image_url: img ? img.src : null };
                }
                return null;
            }
        """)
        if not result: return None, None

        title = result["title"]
        # Validate: must contain a WM keyword AND not be a spare part
        has_wm   = any(k in title for k in WM_KEYWORDS)
        is_part  = any(k in title for k in BLOCK_KEYWORDS)
        if not has_wm or is_part:
            print(f"    ✗ Skipped (spare part or unrelated): {title[:60]}")
            return None, None

        print(f"    ✓ Match: {title[:60]}")
        # Get high-res image from product detail page
        try:
            await page.goto(result["href"], wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)
            detail_img = await page.evaluate("""
                () => {
                    const og = document.querySelector('meta[property="og:image"]');
                    if (og && og.content && og.content.startsWith('http')) return og.content;
                    const img = document.querySelector('img#landingImage, img#imgBlkFront, #main-image-container img');
                    return img && img.src.startsWith('http') ? img.src : null;
                }
            """)
            if detail_img: return detail_img, result["href"]
        except Exception as e:
            print(f"    Detail page error: {e}")
        return result["image_url"], result["href"]
    except Exception as e:
        print(f"    Error: {e}")
        return None, None

async def main():
    res = supabase.table("products").select("id, brand, model_number, image_url").eq("category", "WM").eq("is_active", True).execute()
    wms = res.data or []
    print(f"=== WM Model-Specific Image Enricher ===")
    print(f"Processing {len(wms)} products...\n")

    success = kept = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(extra_http_headers=HEADERS)

        for i, p in enumerate(wms):
            brand = p["brand"]
            model = p["model_number"]
            pid   = p["id"]
            print(f"[{i+1}/{len(wms)}] {brand} {model}")

            img_url, amz_url = await search_amazon_wm(page, brand, model)

            if img_url:
                upd = {"image_url": img_url}
                if amz_url: upd["amazon_url"] = amz_url
                supabase.table("products").update(upd).eq("id", pid).execute()
                print(f"    → Saved\n")
                success += 1
            else:
                print(f"    → Keeping brand fallback\n")
                kept += 1

            await asyncio.sleep(2)
        await browser.close()

    print(f"\n{'='*50}")
    print(f"Model-specific images: {success} | Brand fallback kept: {kept}")

asyncio.run(main())
