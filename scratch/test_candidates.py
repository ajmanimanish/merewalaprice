import asyncio
from playwright.async_api import async_playwright
import re

asins = [
    {"label": "Voltas AC", "asin": "B0CWVDN3HZ"},
    {"label": "Samsung TV 1", "asin": "B0C3R2T2J2"},
    {"label": "Samsung TV 2", "asin": "B0C3R8Y19G"},
    {"label": "Samsung TV 3", "asin": "B0C3R5D8KY"},
    {"label": "Samsung TV 4", "asin": "B0C3R2T2J3"}
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for item in asins:
            url = f"https://www.amazon.in/dp/{item['asin']}"
            print(f"Testing {item['label']} ({item['asin']}): {url}...")
            try:
                await page.goto(url, timeout=15000)
                title = await page.title()
                content = await page.content()
                if "page not found" in title.lower() or "page not found" in content.lower():
                    print("  -> NOT FOUND")
                elif "enter the characters you see below" in content.lower():
                    print("  -> BLOCKED BY CAPTCHA")
                else:
                    print(f"  -> FOUND: {title[:80]}...")
            except Exception as e:
                print(f"  -> ERROR: {e}")
                
        await browser.close()

asyncio.run(main())
