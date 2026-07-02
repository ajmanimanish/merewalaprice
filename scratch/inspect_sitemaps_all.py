import asyncio
from playwright.async_api import async_playwright
import xml.etree.ElementTree as ET

sitemaps = [
    {"brand": "LG", "url": "https://www.lg.com/in/sitemap.xml"},
    {"brand": "Haier", "url": "https://www.haier.com/in/sitemap.xml"},
    {"brand": "BlueStar", "url": "https://www.bluestarindia.com/sitemap.xml"},
    {"brand": "Daikin", "url": "https://daikinindia.com/sitemap.xml"},
    {"brand": "Voltas", "url": "https://www.voltas.com/sitemap_products_1.xml"}
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        for item in sitemaps:
            print(f"\n======================================")
            print(f"Loading sitemap for {item['brand']}...")
            try:
                r = await page.goto(item["url"], timeout=30000)
                # Get raw text content
                content = await page.content()
                print(f"  -> Content length: {len(content)} bytes")
                
                # Try to find URLs using regex to be parsing-independent
                import re
                urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
                print(f"  -> Found {len(urls)} URLs in XML structure.")
                print("  -> First 10 URLs:")
                for u in urls[:10]:
                    print(f"     - {u}")
            except Exception as e:
                print(f"  -> Error: {e}")
                
        await browser.close()

asyncio.run(main())
