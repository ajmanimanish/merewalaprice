import re
import httpx

def inspect_brand_urls(brand, url):
    print(f"\n--- URL Inspection for {brand} ({url}) ---")
    try:
        r = httpx.get(url, verify=False, timeout=20.0)
        content = r.text
        urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
        print(f"Total URLs: {len(urls)}")
        # Filter and print different categories
        for kw in ["ac", "conditioner", "room", "ref", "freezer", "split", "product", "detail", "products"]:
            matches = [u for u in urls if kw in u.lower()]
            print(f"Matches for '{kw}': {len(matches)}")
            if matches:
                print("  Examples:")
                for m in matches[:3]:
                    print(f"   - {m}")
    except Exception as e:
        print("Error:", e)

inspect_brand_urls("BlueStar", "https://www.bluestarindia.com/sitemap.xml")
inspect_brand_urls("Daikin", "https://daikinindia.com/sitemap.xml")
