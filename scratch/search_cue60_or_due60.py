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
        
        # Test 1: Search exact 2024 model
        url1 = "https://www.amazon.in/s?k=UA43DUE60AKLXL"
        print(f"Searching: {url1}")
        await page.goto(url1, timeout=30000)
        await page.wait_for_timeout(3000)
        
        items1 = await page.query_selector_all(".s-result-item")
        print(f"Results for UA43DUE60AKLXL: {len(items1)}")
        for i, item in enumerate(items1):
            text = await item.inner_text()
            if text:
                price_el = await item.query_selector(".a-price-whole")
                price = await price_el.inner_text() if price_el else "None"
                # Find link
                link_el = await item.query_selector("a.a-link-normal")
                href = await link_el.get_attribute("href") if link_el else ""
                asin_match = re.search(r'/dp/([A-Z0-9]{10})', href)
                asin = asin_match.group(1) if asin_match else "None"
                print(f"  Item {i}: Title={text.strip().split(chr(10))[0][:80]}, ASIN={asin}, Price={price}")
                
        # Test 2: Search Crystal 4K 43 inch TV
        url2 = "https://www.amazon.in/s?k=Samsung+43+inch+Crystal+4K+TV"
        print(f"\nSearching: {url2}")
        await page.goto(url2, timeout=30000)
        await page.wait_for_timeout(3000)
        
        items2 = await page.query_selector_all(".s-result-item")
        print(f"Results for Crystal 4K: {len(items2)}")
        for i, item in enumerate(items2[:8]):
            text = await item.inner_text()
            if text:
                price_el = await item.query_selector(".a-price-whole")
                price = await price_el.inner_text() if price_el else "None"
                link_el = await item.query_selector("a.a-link-normal")
                href = await link_el.get_attribute("href") if link_el else ""
                asin_match = re.search(r'/dp/([A-Z0-9]{10})', href)
                asin = asin_match.group(1) if asin_match else "None"
                print(f"  Item {i}: Title={text.strip().split(chr(10))[0][:80]}, ASIN={asin}, Price={price}")
                
        await browser.close()

asyncio.run(main())
