import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACTS_DIR = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 1000}
        )
        page = await context.new_page()
        
        # Try B0D1YF8BHP
        url = "https://www.amazon.in/dp/B0D1YF8BHP"
        print(f"Loading {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_load_state("networkidle")
        
        title = await page.title()
        print("Title:", title)
        
        # Save screenshot
        await page.screenshot(path=f"{ARTIFACTS_DIR}/test_direct.png")
        print("Saved screenshot to test_direct.png")
        
        await browser.close()

asyncio.run(main())
