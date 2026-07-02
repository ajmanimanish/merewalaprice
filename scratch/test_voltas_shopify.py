import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        url = "https://www.voltas.com/sitemap.xml"
        print(f"Loading {url}...")
        try:
            r = await page.goto(url, timeout=30000)
            status = r.status if r else "None"
            content = await page.content()
            print(f"Status: {status} | Length: {len(content)}")
            
            # Find loc tags
            urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
            print(f"Found {len(urls)} URLs in Voltas main sitemap:")
            for u in urls:
                print(" -", u)
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
