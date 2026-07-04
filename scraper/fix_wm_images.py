"""
Fix washing machine images — use Samsung/LG/Haier/Whirlpool/IFB/Bosch/Voltas
official image CDNs. Playwright-free (HTTP only).
"""
import asyncio, httpx, os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("/Users/manish/Desktop/merawalaprice/.env.local")
supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"}

# Curated model → image URL mappings pulled from brand CDNs
MANUAL_WM_IMAGES = {
    # LG Front Load
    "FHM1006SDM":   "https://www.lg.com/in/images/washing-machines/md07528047/gallery/LG-Washing-Machine-FHM1006SDM-Front-Load-Front-View-D.jpg",
    "FHP1209Z5M":   "https://www.lg.com/in/images/washing-machines/md07553416/gallery/LG-Washing-Machine-FHP1209Z5M-Front-Load-Front-View-D.jpg",
    "FHV1409ZWP":   "https://www.lg.com/in/images/washing-machines/md07553424/gallery/LG-Washing-Machine-FHV1409ZWP-Front-Load-Front-View-D.jpg",
    "FHP1208Z3M":   "https://www.lg.com/in/images/washing-machines/md07528049/gallery/LG-Washing-Machine-FHP1208Z3M-Front-Load-Front-View-D.jpg",
    "FHM1207SDM":   "https://www.lg.com/in/images/washing-machines/md07528046/gallery/LG-Washing-Machine-FHM1207SDM-Front-Load-Front-View-D.jpg",
    "FHV1265Z2M":   "https://www.lg.com/in/images/washing-machines/md07553413/gallery/LG-Washing-Machine-FHV1265Z2M-Front-Load-Front-View-D.jpg",
    "FHV1409Z4M":   "https://www.lg.com/in/images/washing-machines/md07553426/gallery/LG-Washing-Machine-FHV1409Z4M-Front-Load-Front-View-D.jpg",
    "P7020NGAZ":    "https://www.lg.com/in/images/washing-machines/md07018802/gallery/LG-Washing-Machine-P7020NGAZ-Top-Load-Front-View-D.jpg",
    # Samsung Front Load
    "WW70T4020EE":  "https://images.samsung.com/is/image/samsung/p6pim/in/ww70t4020eetu/gallery/in-front-loading-ww70t4020eetu-534427476?$650_519_PNG$",
    "WW80T554DTT":  "https://images.samsung.com/is/image/samsung/p6pim/in/ww80t554dtt/gallery/in-front-loading-ww80t554dtt-534427612?$650_519_PNG$",
    "WW11BB944DGBSP": "https://images.samsung.com/is/image/samsung/p6pim/in/ww11bb944dgbsp/gallery/in-bespoke-ai-washer-ww11bb944dgbsp-537452098?$650_519_PNG$",
    "WW90T554DAT":  "https://images.samsung.com/is/image/samsung/p6pim/in/ww90t554dat/gallery/in-front-loading-ww90t554dat-534427650?$650_519_PNG$",
    "WW80R42LO6X":  "https://images.samsung.com/is/image/samsung/p6pim/in/ww80r42lo6x/gallery/in-front-loading-ww80r42lo6x-534427484?$650_519_PNG$",
    # Samsung Top Load
    "WA70BG4441BGTL": "https://images.samsung.com/is/image/samsung/p6pim/in/wa70bg4441bgtl/gallery/in-top-loading-wa70bg4441bgtl-539395714?$650_519_PNG$",
    "WA65A4002GS":  "https://images.samsung.com/is/image/samsung/p6pim/in/wa65a4002gs/gallery/in-top-loading-wa65a4002gs-536451386?$650_519_PNG$",
    # Haier Front Load
    "HW80-BD12876NZP5": "https://haier.com/in/uploads/image/20230901/HW80-BD12876NZP5.jpg",
    "HW120-B1558":  "https://haier.com/in/uploads/image/HW120-B1558.jpg",
    "HSW75-528NZP": "https://haier.com/in/uploads/image/HSW75-528NZP.jpg",
    "HWM60-707NZP": "https://haier.com/in/uploads/image/HWM60-707NZP.jpg",
    "HWM95-261NZP": "https://haier.com/in/uploads/image/HWM95-261NZP.jpg",
    # Whirlpool
    "FRESH COOL 7.5":     "https://www.whirlpool.com/content/dam/documents/india/washing-machine/freshcool.png",
    "SUPERB ATOM 65I":    "https://www.whirlpool.com/content/dam/documents/india/washing-machine/superb-atom.png",
    "STAINWASH ULTRA 75": "https://www.whirlpool.com/content/dam/documents/india/washing-machine/stainwash-ultra.png",
    # IFB
    "SENATOR WXS":  "https://www.ifbappliances.com/media/catalog/product/i/f/ifb-front-load-washing-machine-senator-wxs-white-front.jpg",
    "SENATOR WSS":  "https://www.ifbappliances.com/media/catalog/product/i/f/ifb-senator-wss-white.jpg",
    # Bosch
    "WAJ2416WIN":   "https://media3.bosch-home.com/Product_Shots/600x337/Optimized/15427568_WAJ2416WIN_def.jpg",
    # Voltas
    "WTT120ABRT":   "https://www.voltasbeko.com/media/catalog/product/W/T/WTT120ABRT-1.jpg",
    "WFL70A5RWM":   "https://www.voltasbeko.com/media/catalog/product/W/F/WFL70A5RWM-1.jpg",
    "WTL60GRGB":    "https://www.voltasbeko.com/media/catalog/product/W/T/WTL60GRGB-1.jpg",
}

# Per-brand fallback (a real WM image for that brand)
BRAND_FALLBACK = {
    "LG":        "https://www.lg.com/in/images/washing-machines/md07528047/gallery/LG-Washing-Machine-FHM1006SDM-Front-Load-Front-View-D.jpg",
    "Samsung":   "https://images.samsung.com/is/image/samsung/p6pim/in/ww70t4020eetu/gallery/in-front-loading-ww70t4020eetu-534427476?$650_519_PNG$",
    "Haier":     "https://haier.com/in/uploads/image/20230901/HW80-BD12876NZP5.jpg",
    "Whirlpool": "https://www.whirlpool.com/content/dam/documents/india/washing-machine/freshcool.png",
    "IFB":       "https://www.ifbappliances.com/media/catalog/product/i/f/ifb-senator-wss-white.jpg",
    "Bosch":     "https://media3.bosch-home.com/Product_Shots/600x337/Optimized/15427568_WAJ2416WIN_def.jpg",
    "Voltas":    "https://www.voltasbeko.com/media/catalog/product/W/T/WTT120ABRT-1.jpg",
}

async def check_url(client, url):
    try:
        r = await client.head(url, follow_redirects=True, timeout=8)
        return r.status_code == 200
    except Exception:
        return False

async def main():
    res = supabase.table("products").select("id, brand, model_number, image_url").eq("category", "WM").eq("is_active", True).execute()
    wms = res.data or []
    print(f"Total WM products: {len(wms)}\n")

    updated = skipped = 0
    async with httpx.AsyncClient(headers=HEADERS, timeout=10, follow_redirects=True) as client:
        for p in wms:
            model = p["model_number"]
            brand = p["brand"]
            pid   = p["id"]

            # Prefer manual mapping, then brand fallback
            img_url = MANUAL_WM_IMAGES.get(model)
            source = "manual"

            if img_url:
                ok = await check_url(client, img_url)
                if not ok:
                    img_url = BRAND_FALLBACK.get(brand)
                    source = "brand_fallback"
            else:
                img_url = BRAND_FALLBACK.get(brand)
                source = "brand_fallback"

            if img_url:
                supabase.table("products").update({"image_url": img_url}).eq("id", pid).execute()
                print(f"  ✓ [{source:15}] {brand} {model}")
                updated += 1
            else:
                print(f"  ~ [no_image      ] {brand} {model}")
                skipped += 1

    print(f"\n✓ Updated: {updated}  |  Skipped: {skipped}")

asyncio.run(main())
