import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 1000},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        urls = [
            "https://www.lg.com/in/split-ac",
            "https://www.lg.com/in/refrigerators",
            "https://www.lg.com/in/washing-machines",
            "https://www.lg.com/in/tvs"
        ]
        
        for url in urls:
            print(f"\nLoading LG category: {url}...")
            try:
                r = await page.goto(url, timeout=30000)
                status = r.status if r else "None"
                print(f"  -> Status: {status}")
                if status == 200:
                    # Find links
                    links = await page.query_selector_all("a")
                    product_links = []
                    for link in links:
                        href = await link.get_attribute("href")
                        if href and "/in/" in href and (len(href.split('/')) >= 4):
                            # Usually product pages end with the model code, e.g. /in/washing-machines/fhv1207z4m/
                            product_links.append(href)
                            
                    dedup = sorted(list(set(product_links)))
                    print(f"  -> Found {len(dedup)} potential product/sub-category links.")
                    print("  -> First 5 links:")
                    for l in dedup[:5]:
                        print(f"     - {l}")
            except Exception as e:
                print(f"  -> Error: {e}")
                
        await browser.close()

asyncio.run(main())
