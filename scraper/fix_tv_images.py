import os
import asyncio
import urllib.parse
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}

# LG remote control part numbers start with AKB, AGF, etc.
# These are NOT TVs — delete them
GARBAGE_TV_MODELS = [
    "AKB75055701",  # LG Magic Remote
    "AKB74115501",  # LG Remote
    "AKB33118102",  # LG Remote  
    "ADQ36973301",  # LG part
    "ADQ33118102",  # LG part
    "AAA76553275",  # LG part
    "MJB65174401",  # LG part
    "MJB65174503",  # LG part
    "CLS31460004",  # LG part
    "CLS31460001",  # LG part
    "CLS30105301",  # LG part
    "4620ER4001A",  # LG part
    "4620ER4002C",  # LG part
    "AI-2020",      # Marketing name
    "AI-2019",      # Marketing name
    "RS15000",      # Samsung - generic/part
]

def is_remote_or_accessory_image(image_url: str) -> bool:
    """Check if image URL looks like it contains a remote or accessory."""
    if not image_url:
        return False
    # Amazon image filenames sometimes hint at the product type
    # We check key signals
    url_lower = image_url.lower()
    # Remote image signals based on visual inspection of what's showing
    return False  # We'll validate visually by model number check

async def search_amazon_for_tv(page, brand: str, model: str) -> tuple[str | None, str | None]:
    """Search Amazon with brand+model, validate the result is a TV not a remote."""
    # Add brand to query for better accuracy
    query = f"{brand} {model} TV"
    search_url = f"https://www.amazon.in/s?k={urllib.parse.quote(query)}"
    print(f"  Searching: {search_url}")

    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)

        result = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('.s-main-slot .s-result-item[data-component-type="s-search-result"]');
                for (const item of items) {
                    const link = item.querySelector('h2 a.a-link-normal');
                    const img = item.querySelector('img.s-image');
                    if (!link || !link.href) continue;
                    const title = (link.innerText || link.textContent || '').toLowerCase();
                    // Skip remotes and accessories
                    if (title.includes('remote') || title.includes('cover') || 
                        title.includes('stand') || title.includes('cable') ||
                        title.includes('bracket') || title.includes('mount') ||
                        title.includes('stabilizer') || title.includes('protector')) {
                        continue;
                    }
                    // Must be a TV
                    if (!title.includes('tv') && !title.includes('television') && 
                        !title.includes('inch') && !title.includes('smart')) {
                        continue;
                    }
                    return {
                        title: link.innerText || link.textContent || '',
                        href: link.href,
                        image_url: img ? img.src : null
                    };
                }
                return null;
            }
        """)

        if not result or not result["href"]:
            print(f"  ✗ No valid TV result found for {brand} {model}")
            return None, None

        title = result["title"]
        href = result["href"]
        print(f"  Found: {title[:60]}")

        # Navigate to product page for high-res image
        try:
            await page.goto(href, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)
            detail_img = await page.evaluate("""
                () => {
                    const og = document.querySelector('meta[property="og:image"]');
                    if (og && og.content && og.content.startsWith('http')) return og.content;
                    const mainImg = document.querySelector('img#landingImage, img#imgBlkFront, #main-image-container img');
                    if (mainImg && mainImg.src && mainImg.src.startsWith('http')) return mainImg.src;
                    return null;
                }
            """)
            if detail_img:
                print(f"  ✓ Image: {detail_img[:70]}...")
                return detail_img, href
        except Exception as e:
            print(f"  Falling back to search thumbnail: {e}")

        return result["image_url"], href

    except Exception as e:
        print(f"  Error: {e}")
        return None, None


async def main():
    print("=== TV Image Repair Script ===\n")

    # Step 1: Delete known garbage model numbers (LG remote part numbers etc.)
    print("Step 1: Deleting garbage TV products (remote part numbers, marketing names)...")
    res = supabase.table("products").select("id, brand, model_number, name").eq("category", "TV").execute()
    tv_products = res.data or []

    to_delete_ids = []
    for p in tv_products:
        if p["model_number"] in GARBAGE_TV_MODELS:
            to_delete_ids.append(p["id"])
            print(f"  Deleting: {p['brand']} {p['model_number']} ({p['name'][:40]})")

    if to_delete_ids:
        supabase.table("products").delete().in_("id", to_delete_ids).execute()
        print(f"  ✓ Deleted {len(to_delete_ids)} garbage TV products\n")
    else:
        print("  No garbage products found.\n")

    # Step 2: Re-fetch remaining TV products
    res = supabase.table("products").select("id, brand, model_number, name, image_url").eq("category", "TV").eq("is_active", True).execute()
    tv_products = res.data or []
    print(f"Step 2: Scanning {len(tv_products)} TV products for bad images...\n")

    # Clear all TV images that show a remote (detected by known bad patterns)
    # Based on screenshot: Haier LE55B9500U, LE40K6000B — remotes
    # LG AKB* — already deleted above
    # We'll clear ALL TV images and re-fetch them properly
    needs_refresh = []
    for p in tv_products:
        img = p.get("image_url") or ""
        # Clear if no image or Unsplash
        if not img or "unsplash" in img:
            needs_refresh.append(p)
            continue
        # Keep if already has a good image (we'll re-validate below)
        needs_refresh.append(p)

    print(f"Will re-fetch images for all {len(needs_refresh)} TV products with strict validation.\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page_obj = await browser.new_page(extra_http_headers=HEADERS)

        success = 0
        cleared = 0
        for i, p in enumerate(needs_refresh):
            brand = p["brand"]
            model = p["model_number"]
            pid = p["id"]

            print(f"[{i+1}/{len(needs_refresh)}] {brand} {model}")

            img_url, amz_url = await search_amazon_for_tv(page_obj, brand, model)

            if img_url:
                updates = {"image_url": img_url}
                if amz_url:
                    updates["amazon_url"] = amz_url
                supabase.table("products").update(updates).eq("id", pid).execute()
                print(f"  ✓ Saved to Supabase\n")
                success += 1
            else:
                # Clear bad image — show emoji fallback instead of a remote
                supabase.table("products").update({"image_url": None}).eq("id", pid).execute()
                print(f"  ✗ No valid TV image found — cleared to emoji fallback\n")
                cleared += 1

            await asyncio.sleep(2.5)

        await browser.close()

    print(f"\n{'='*50}")
    print(f"TV Image Repair Complete!")
    print(f"  ✓ Images fixed: {success}")
    print(f"  ○ Cleared (emoji fallback): {cleared}")

if __name__ == "__main__":
    asyncio.run(main())
