import asyncio
import os
import re
import urllib.parse
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BRAND_URLS = {
    ("LG", "AC"):     "https://www.lg.com/in/air-conditioners/split-air-conditioners/{model}/",
    ("LG", "TV"):     "https://www.lg.com/in/tv-soundbars/all-tv-soundbars/{model}/",
    ("LG", "WM"):     "https://www.lg.com/in/washing-machines/front-load/{model}/",
    ("LG", "FRIDGE"): "https://www.lg.com/in/refrigerators/all-refrigerators/{model}/",
    ("Samsung", "AC"):     "https://www.samsung.com/in/air-conditioners/all-air-conditioners/?galaxy-ai={model}",
    ("Samsung", "TV"):     "https://www.samsung.com/in/tvs/uhd-4k-tv/{model}/",
    ("Samsung", "WM"):     "https://www.samsung.com/in/washing-machines/front-load-wm/{model}/",
    ("Samsung", "FRIDGE"): "https://www.samsung.com/in/refrigerators/single-door/{model}/",
    ("Sony", "TV"): "https://www.sony.co.in/en/articles/kd-43x74l",
    ("Blue Star", "AC"): "https://www.bluestarindia.com/ac/split-ac/ie518pnu",
    ("Voltas", "AC"): "https://www.voltastac.com/product/185v-dzw-1-5-ton-5-star-inverter-split-ac",
    ("Daikin", "AC"): "https://www.daikinindia.com/product/ftkr50tv",
    ("Whirlpool", "WM"):     "https://www.whirlpool.com/in/en/washers/top-loading/31514.html",
    ("Whirlpool", "FRIDGE"): "https://www.whirlpool.com/in/en/refrigerators/double-door/if-inv-cnv-278.html",
    ("IFB", "WM"): "https://www.ifbappliances.com/washing-machines/front-load/senator-wss",
    ("Bosch", "WM"): "https://www.bosch-home.com/in/products/washing-and-drying/washing-machines/waj2416win",
    ("Godrej", "FRIDGE"): "https://www.godrejappliances.com/products/refrigerators",
    ("HP", "LAPTOP"): "https://www.hp.com/in-en/shop/pdp/hp-laptop-15s-eq2143au",
    ("Dell", "LAPTOP"): "https://www.dell.com/en-in/shop/dell-laptops/inspiron-15-laptop/spd/inspiron-15-3520-laptop",
    ("Lenovo", "LAPTOP"): "https://www.lenovo.com/in/en/p/laptops/ideapad/ideapad-300/ideapad-slim-3-gen-6-15-amd/82rk00vdin",
    ("ASUS", "LAPTOP"): "https://www.asus.com/in/laptops/for-home/vivobook/asus-vivobook-15-x1502/",
    ("Acer", "LAPTOP"): "https://www.acer.com/in-en/laptops/aspire/aspire-5/pdp/nx-k7esi-001",
    ("TCL", "TV"): None,
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
    return model.lower().replace(" ", "-").replace("/", "-")

async def fetch_og_image_http(url: str) -> str | None:
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS) as client:
            r = await client.get(url)
            if r.status_code != 200:
                return None
            soup = BeautifulSoup(r.text, "html.parser")
            og = soup.find("meta", property="og:image")
            if og and og.get("content") and og["content"].startswith("http"):
                return og["content"]
    except Exception as e:
        print(f"    HTTP fetch error: {e}")
    return None

async def search_amazon_strict(page, brand: str, model: str) -> tuple[str | None, str | None]:
    search_query = f"{model}"
    search_url = f"https://www.amazon.in/s?k={urllib.parse.quote(search_query)}"
    print(f"  Searching Amazon: {search_url}")
    
    try:
        await page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)
        
        # Extract first product title, href, and image
        result = await page.evaluate("""
            () => {
                const item = document.querySelector('.s-main-slot .s-result-item[data-component-type="s-search-result"]');
                if (!item) return null;
                const link = item.querySelector('h2 a.a-link-normal');
                const img = item.querySelector('img.s-image');
                if (link && link.href) {
                    return {
                        title: link.innerText || "",
                        href: link.href,
                        image_url: img ? img.src : null
                    };
                }
                return null;
            }
        """)
        
        if not result or not result["href"]:
            print("  ✗ No search result found.")
            return None, None
            
        title = result["title"]
        href = result["href"]
        img_url = result["image_url"]
        
        # STRICT model check: model number (cleaned) must be in the title
        model_clean = model.lower().replace("-", "").replace(" ", "")
        title_clean = title.lower().replace("-", "").replace(" ", "")
        
        if model_clean not in title_clean:
            print(f"  ✗ Model validation failed. Model {model} not in title: {title[:50]}")
            return None, None
            
        print(f"  ✓ Model verified in search result: {title[:50]}")
        
        # Go to product detail page to get high quality og:image
        try:
            await page.goto(href, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(2000)
            detail_img = await page.evaluate("""
                () => {
                    const og = document.querySelector('meta[property="og:image"]');
                    if (og && og.content && og.content.startsWith('http') && !og.content.includes('placeholder')) {
                        return og.content;
                    }
                    const mainImg = document.querySelector('img#landingImage, img#imgBlkFront, #main-image-container img');
                    if (mainImg && mainImg.src && mainImg.src.startsWith('http')) {
                        return mainImg.src;
                    }
                    return null;
                }
            """)
            if detail_img:
                return detail_img, href
        except Exception as e:
            print(f"    Failed to load detail page for image extraction, falling back to search result image: {e}")
            
        return img_url, href
        
    except Exception as e:
        print(f"    Amazon search error: {e}")
        return None, None

async def enrich_product(page, product: dict) -> dict:
    brand = product["brand"]
    model = product["model_number"]
    category = product["category"]
    pid = product["id"]
    model_slug = normalise_model(model)

    print(f"\n{'─'*55}")
    print(f"  {brand} | {model} | {category}")

    image_url = None
    amazon_url = None
    key = (brand, category)
    brand_url = BRAND_URLS.get(key)

    # 1. Brand URL Check
    if brand_url:
        full_url = brand_url.format(model=model_slug)
        image_url = await fetch_og_image_http(full_url)
        if image_url:
            print(f"  ✓ Found via Brand website og:image")

    # 2. Amazon STRICT fallback search
    if not image_url:
        print(f"  Running STRICT Amazon search...")
        image_url, amazon_url = await search_amazon_strict(page, brand, model)

    # 3. Update Supabase
    updates = {}
    if image_url:
        updates["image_url"] = image_url
    if amazon_url:
        updates["amazon_url"] = amazon_url
        
    if updates:
        supabase.table("products").update(updates).eq("id", pid).execute()
        print(f"  ✓ Saved to Supabase")
        return {"id": pid, "status": "success"}
    else:
        print(f"  ✗ No validated image found")
        return {"id": pid, "status": "failed"}

async def main():
    print("MereWalaPrice — STRICT Product Image Enrichment")
    print("=" * 55)

    # Fetch products without real images (Unsplash placeholder or null)
    res = supabase.table("products").select("id, name, brand, model_number, category, image_url").eq("is_active", True).execute()
    products = res.data or []
    
    to_enrich = []
    for p in products:
        img = p.get("image_url") or ""
        if not img or "unsplash" in img or img.strip() == "":
            to_enrich.append(p)
            
    print(f"Total products needing images: {len(to_enrich)}")
    if not to_enrich:
        print("All products have real images!")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(extra_http_headers=HEADERS)
        
        results = []
        for product in to_enrich:
            res_dict = await enrich_product(page, product)
            results.append(res_dict)
            await asyncio.sleep(2)
            
        await browser.close()

    success = [r for r in results if r["status"] == "success"]
    print(f"\nEnrichment finished. Successfully updated: {len(success)}/{len(results)} products.")

if __name__ == "__main__":
    asyncio.run(main())
