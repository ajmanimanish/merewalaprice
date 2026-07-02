import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Emulate iPhone 12/13/14 screen viewport (390x844)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        )
        
        # 1. Capture Home Page
        page = await context.new_page()
        print("Navigating to https://merawalaprice.vercel.app/...")
        await page.goto("https://merawalaprice.vercel.app/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        home_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/home_page_screenshot.png"
        print(f"Capturing Home Page to {home_path}...")
        await page.screenshot(path=home_path)
        
        # 2. Capture Product Detail Page (using Voltas split AC, product id: voltas-185v-vectra-car or voltas-123inv)
        print("Navigating to https://merawalaprice.vercel.app/product/voltas-185v-vectra-car...")
        await page.goto("https://merawalaprice.vercel.app/product/voltas-185v-vectra-car", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Scroll down slightly to make sure the online prices and bank offers section is in view
        await page.evaluate("window.scrollTo(0, 320)")
        await page.wait_for_timeout(1000)
        
        product_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/product_page_screenshot.png"
        print(f"Capturing Product Page to {product_path}...")
        await page.screenshot(path=product_path)
        
        print("Done capturing screenshots!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
