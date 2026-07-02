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
        
        url = "https://www.amazon.in/s?k=Blue+Star+IE518PNU"
        print(f"Loading {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        items = await page.query_selector_all(".s-result-item")
        print(f"Total search result items: {len(items)}")
        
        for i, item in enumerate(items[:5]):
            print(f"\n--- ITEM {i} ---")
            html = await item.inner_html()
            # print first 300 chars of HTML
            # print clean text
            text = await item.inner_text()
            print("Text:", repr(text[:200]))
            
            # Check price
            price_el = await item.query_selector(".a-price-whole")
            price_text = await price_el.inner_text() if price_el else "None"
            print("Price Selector Result:", price_text)
            
            # Check title
            title_el = await item.query_selector("h2 a span")
            title_text = await title_el.inner_text() if title_el else "None"
            print("Title Selector Result:", title_text)
            
        await browser.close()

asyncio.run(main())
