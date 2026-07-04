"""
WM image enricher using direct brand website HTTP requests.
Constructs product page URLs from known brand URL patterns,
fetches og:image using httpx (no Playwright, no blocking).
"""
import asyncio, httpx, os, re
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}

def samsung_urls(model: str) -> list[str]:
    m = model.lower()
    if m.startswith("ww"):  # Front load
        return [
            f"https://www.samsung.com/in/washing-machines/front-load-wm/{m}/",
            f"https://www.samsung.com/in/washing-machines/all-washing-machines/?galaxy-ai={model}",
        ]
    else:  # Top load (WA*)
        return [
            f"https://www.samsung.com/in/washing-machines/top-loading-wm/{m}/",
            f"https://www.samsung.com/in/washing-machines/all-washing-machines/?galaxy-ai={model}",
        ]

def lg_urls(model: str) -> list[str]:
    m = model.lower()
    if m.startswith("f"):  # Front load (FHM, FHP, FHV etc)
        return [
            f"https://www.lg.com/in/washing-machines/front-load/{m}/",
            f"https://www.lg.com/in/washing-machines/all-washing-machines/{m}/",
        ]
    else:  # Top load (T*, P*)
        return [
            f"https://www.lg.com/in/washing-machines/top-load/{m}/",
            f"https://www.lg.com/in/washing-machines/all-washing-machines/{m}/",
        ]

def haier_urls(model: str) -> list[str]:
    m = model.lower()
    # HW* = front load, HSW* = semi-automatic, HWM* = top load
    if m.startswith("hw") and not m.startswith("hwm"):
        return [
            f"https://haier.com/in/washing-machines/front-load-washing-machine/{m}.html",
            f"https://haier.com/in/washing-machines/{m}.html",
        ]
    elif m.startswith("hsw"):
        return [
            f"https://haier.com/in/washing-machines/semi-automatic/{m}.html",
            f"https://haier.com/in/washing-machines/{m}.html",
        ]
    else:  # HWM* = top load
        return [
            f"https://haier.com/in/washing-machines/top-load-washing-machine/{m}.html",
            f"https://haier.com/in/washing-machines/{m}.html",
        ]

def voltas_urls(model: str) -> list[str]:
    m = model.lower()
    if "tt" in m:  # WTT* = top load
        return [f"https://www.voltasbeko.com/washing-machines/top-load/{m}"]
    else:  # WTL* = fully automatic top load
        return [f"https://www.voltasbeko.com/washing-machines/fully-automatic-top-load/{m}"]

def bosch_urls(model: str) -> list[str]:
    m = model.lower()
    return [
        f"https://www.bosch-home.com/in/products/washing-and-drying/washing-machines/washing-machines/{m}",
        f"https://www.bosch-home.com/in/products/washing-and-drying/washing-machines/{m}",
    ]

def ifb_urls(model: str) -> list[str]:
    m = model.lower().replace(" ", "-").replace("_", "-")
    return [
        f"https://www.ifbappliances.com/washing-machines/front-load/{m}",
        f"https://www.ifbappliances.com/washing-machines/top-load/{m}",
    ]

def whirlpool_urls(model: str) -> list[str]:
    m = model.lower().replace(" ", "-")
    return [
        f"https://www.whirlpool.com/in/en/washers/top-loading/{m}.html",
        f"https://www.whirlpool.com/in/en/washers/front-loading/{m}.html",
    ]

BRAND_URL_BUILDERS = {
    "Samsung":   samsung_urls,
    "LG":        lg_urls,
    "Haier":     haier_urls,
    "Voltas":    voltas_urls,
    "Bosch":     bosch_urls,
    "IFB":       ifb_urls,
    "Whirlpool": whirlpool_urls,
}

# Croma search as universal fallback
def croma_search_url(brand: str, model: str) -> str:
    return f"https://www.croma.com/searchB?q={brand}+{model}"

async def extract_og_image(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch URL and extract og:image meta tag."""
    try:
        r = await client.get(url, timeout=10)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        # og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content") and og["content"].startswith("http"):
            img = og["content"]
            if any(bad in img.lower() for bad in ["logo", "favicon", "placeholder", "noimage"]):
                return None
            return img
        # twitter:image fallback
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content") and tw["content"].startswith("http"):
            return tw["content"]
    except Exception:
        pass
    return None

async def extract_croma_image(client: httpx.AsyncClient, brand: str, model: str) -> str | None:
    """Search Croma and extract first product image."""
    url = croma_search_url(brand, model)
    try:
        r = await client.get(url, timeout=12)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        # Croma product image in search results
        for img in soup.select("img.product-img, img[data-src], div.product-img img"):
            src = img.get("src") or img.get("data-src") or ""
            if src.startswith("http") and "croma" in src and "logo" not in src.lower():
                return src
        # Try og:image from search results page
        og = soup.find("meta", property="og:image")
        if og and og.get("content") and og["content"].startswith("http"):
            return og["content"]
    except Exception:
        pass
    return None

async def get_image_for_product(client: httpx.AsyncClient, brand: str, model: str) -> str | None:
    url_builder = BRAND_URL_BUILDERS.get(brand)
    
    if url_builder:
        urls = url_builder(model)
        for url in urls:
            img = await extract_og_image(client, url)
            if img:
                print(f"    ✓ Brand site [{url[:65]}]")
                return img
    
    # Fallback: Croma search
    img = await extract_croma_image(client, brand, model)
    if img:
        print(f"    ✓ Croma search")
        return img
    
    return None

async def main():
    res = supabase.table("products").select("id, brand, model_number, image_url").eq("category", "WM").eq("is_active", True).execute()
    wms = res.data or []
    print(f"=== WM Brand-Site Image Enricher ===\nProducts: {len(wms)}\n")

    updated = kept = 0
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=12) as client:
        for i, p in enumerate(wms):
            brand = p["brand"]
            model = p["model_number"]
            pid   = p["id"]
            print(f"[{i+1}/{len(wms)}] {brand} {model}")

            img_url = await get_image_for_product(client, brand, model)

            if img_url:
                supabase.table("products").update({"image_url": img_url}).eq("id", pid).execute()
                print(f"    → Saved\n")
                updated += 1
            else:
                print(f"    → Brand fallback kept\n")
                kept += 1

            await asyncio.sleep(0.5)  # Be polite — no heavy Playwright overhead

    print(f"\n{'='*50}")
    print(f"✓ Model-specific: {updated}  |  Brand fallback kept: {kept}")

asyncio.run(main())
