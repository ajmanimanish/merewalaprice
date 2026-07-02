import asyncio
from playwright.async_api import async_playwright
import re

sitemaps = [
    {"brand": "LG", "url": "https://www.lg.com/in/sitemap.xml"},
    {"brand": "Haier", "url": "https://www.haier.com/in/sitemap.xml"},
    {"brand": "BlueStar", "url": "https://www.bluestarindia.com/sitemap.xml"},
    {"brand": "Daikin", "url": "https://daikinindia.com/sitemap.xml"},
    {"brand": "Voltas", "url": "https://www.voltas.com/sitemap_products_1.xml"},
    {"brand": "Whirlpool", "url": "https://www.whirlpoolindia.com/sitemap.xml"}
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        
        for item in sitemaps:
            print(f"\n======================================")
            print(f"Requesting {item['brand']}: {item['url']}...")
            try:
                # Use context.request to get raw HTTP payload
                resp = await context.request.get(item["url"], headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                })
                status = resp.status
                text = await resp.text()
                print(f"  -> Status: {status} | Bytes: {len(text)}")
                
                # Check for URLs
                urls = re.findall(r'<loc>(https?://[^<]+)</loc>', text)
                print(f"  -> Found {len(urls)} URLs.")
                if urls:
                    print("  -> First 3 URLs:")
                    for u in urls[:3]:
                        print(f"     - {u}")
                else:
                    print(f"  -> Snippet: {repr(text[:200])}")
            except Exception as e:
                print(f"  -> Error: {e}")
                
        await browser.close()

asyncio.run(main())
