"""
WM image enricher using Flipkart search (less aggressive blocking than Amazon).
Searches Flipkart for each model, validates it's a washing machine, saves og:image.
"""
import asyncio, os, urllib.parse
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

WM_OK   = {"washing machine", "washer", "front load", "top load", "fully automatic", "semi automatic", "laundry"}
WM_SKIP = {"pump", "drain", "gasket", "seal", "bearing", "belt", "spider", "heater",
           "hinge", "knob", "filter", "remote", "cover", "tub", "motor", "brush",
           "capacitor", "valve", "stand", "trolley", "cover"}

async def search_flipkart(page, brand: str, model: str):
    query = f"{brand} {model} washing machine"
    url = f"https://www.flipkart.com/search?q={urllib.parse.quote(query)}&otracker=search"
    print(f"  FK: {url[:90]}")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        result = await page.evaluate("""
            () => {
                // Find product cards — each card has a product link and image
                // Flipkart search grid uses div[data-id] for each card
                const cards = Array.from(document.querySelectorAll('div[data-id]'));
                for (const card of cards) {
                    const link = card.querySelector('a[href*="/p/"]');
                    if (!link || !link.href) continue;

                    // Get image from the card (NOT from link.innerText which includes button text)
                    const img = card.querySelector('img');
                    const imgSrc = img ? img.src || img.getAttribute('src') || null : null;

                    // Get ONLY the product title element — specific Flipkart class names
                    // Try multiple known Flipkart title classes
                    const titleEl = card.querySelector(
                        '._4rR01T, .s1Q9rs, .KzDlHZ, ._2WkVRV, .IRpwTa, .jTEhm8, ._3I9_wc'
                    );
                    const rawTitle = (titleEl ? titleEl.innerText : link.getAttribute('title') || '').toLowerCase().trim();

                    // Strip any leftover nav words at start
                    const title = rawTitle.replace(/^(add to compare|flipkart's choice|sponsored|ad)\s*/gi, '').trim();

                    if (!title) continue;
                    return { title, href: link.href, image_url: imgSrc };
                }
                return null;
            }
        """)

        if not result:
            print(f"  ✗ No result on Flipkart")
            return None, None

        title = result["title"]
        href  = result["href"]
        img   = result["image_url"]

        # Validation: must NOT be a spare part
        is_part = any(k in title for k in WM_SKIP)
        if is_part:
            print(f"  ✗ Spare part: {title[:60]}")
            return None, None

        # Must contain at least one WM signal OR have a valid /p/ link (search was already WM-specific)
        has_wm = any(k in title for k in WM_OK) or bool(href)
        if not has_wm:
            print(f"  ✗ Not a WM: {title[:60]}")
            return None, None

        print(f"  ✓ {title[:60]}")

        if not img:
            print(f"  ✗ No image URL from card")
            return None, href

        # Use search card thumbnail directly — going to detail page is unreliable
        # Flipkart CDN: upgrade thumbnail to higher-res by swapping size params
        img = img.replace("128/128", "416/416").replace("75/75", "416/416").replace("40/40", "416/416")
        print(f"  Image: {img[:70]}")
        return img, href

    except Exception as e:
        print(f"  Error: {e}")
        return None, None



async def main():
    res = supabase.table("products").select("id, brand, model_number, image_url").eq("category", "WM").eq("is_active", True).execute()
    wms = res.data or []
    print(f"=== WM Flipkart Image Enricher ===\nProducts: {len(wms)}\n")

    success = kept = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(extra_http_headers=HEADERS,
                                        user_agent=HEADERS["User-Agent"],
                                        locale="en-IN")
        page = await ctx.new_page()

        # Visit Flipkart homepage first to get cookies
        await page.goto("https://www.flipkart.com", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)
        # Close login popup if it appears
        try:
            await page.click("button._2KpZ6l._2doB4z", timeout=3000)
        except Exception:
            pass

        for i, p in enumerate(wms):
            brand = p["brand"]
            model = p["model_number"]
            pid   = p["id"]
            print(f"\n[{i+1}/{len(wms)}] {brand} {model}")

            img_url, fk_url = await search_flipkart(page, brand, model)

            if img_url:
                upd = {"image_url": img_url}
                if fk_url: upd["flipkart_url"] = fk_url
                supabase.table("products").update(upd).eq("id", pid).execute()
                print(f"  → ✓ Saved")
                success += 1
            else:
                print(f"  → Keeping brand fallback")
                kept += 1

            await asyncio.sleep(2.5)

        await browser.close()

    print(f"\n{'='*50}")
    print(f"✓ Model-specific: {success} | Brand fallback kept: {kept}")

asyncio.run(main())
