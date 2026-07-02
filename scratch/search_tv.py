import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.amazon.in/s?k=%22UA43CUE60AKLXL%22"
        print(f"Loading {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Save screenshot of search page
        await page.screenshot(path=f"{ARTIFACTS_DIR}/search_exact_tv.png")
        print("Saved screenshot to search_exact_tv.png")
        
        # Log titles
        items = await page.query_selector_all(".s-result-item")
        print(f"Total search results: {len(items)}")
        for i, item in enumerate(items):
            text = await item.inner_text()
            if text:
                print(f"Item {i}: {text.strip().split(chr(10))[0]}")
                
        await browser.close()

asyncio.run(main())
