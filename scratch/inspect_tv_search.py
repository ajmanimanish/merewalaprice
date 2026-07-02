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
        
        # Search for UA43CUE60AKLXL or UA43CUE60KLXL
        query = "UA43CUE60AKLXL"
        url = f"https://www.amazon.in/s?k={query}"
        print(f"Searching: {url}")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        items = await page.query_selector_all(".s-result-item")
        print(f"Total search results: {len(items)}")
        
        for i, item in enumerate(items):
            text = await item.inner_text()
            if not text:
                continue
            
            # Look for links
            links = await item.query_selector_all("a")
            for link in links:
                href = await link.get_attribute("href")
                if href and "/dp/" in href:
                    asin_match = re.search(r'/dp/([A-Z0-9]{10})', href)
                    if asin_match:
                        asin = asin_match.group(1)
                        print(f"Item {i}: ASIN={asin}, Title={text.strip().split(chr(10))[0][:100]}")
                        break
                        
        await browser.close()

asyncio.run(main())
