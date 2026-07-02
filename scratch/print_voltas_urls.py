import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.voltas.com/sitemap_products_1.xml?from=6730475962554&to=8415688589498"
        print(f"Loading Voltas sitemap: {url}...")
        try:
            await page.goto(url, timeout=30000)
            content = await page.content()
            urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
            print(f"Total URLs: {len(urls)}")
            print("\nFirst 40 URLs:")
            for i, u in enumerate(urls[:40]):
                print(f" {i}: {u}")
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
