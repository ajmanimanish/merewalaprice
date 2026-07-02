import asyncio
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
        await page.wait_for_timeout(2000)
        home_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/home_page_screenshot.png"
        await page.screenshot(path=home_path)
        print("Captured Home page.")

        # 2. Capture Browse Page
        print("Navigating to https://merawalaprice.vercel.app/browse...")
        await page.goto("https://merawalaprice.vercel.app/browse", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        browse_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/browse_page_screenshot.png"
        await page.screenshot(path=browse_path)
        print("Captured Browse page.")

        # 3. Capture Search Page
        print("Navigating to https://merawalaprice.vercel.app/search...")
        await page.goto("https://merawalaprice.vercel.app/search", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        search_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/search_page_screenshot.png"
        await page.screenshot(path=search_path)
        print("Captured Search page.")

        # 4. Capture Category AC Page
        print("Navigating to https://merawalaprice.vercel.app/category/AC...")
        await page.goto("https://merawalaprice.vercel.app/category/AC", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        category_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/category_page_screenshot.png"
        await page.screenshot(path=category_path)
        print("Captured Category AC page.")
        
        await browser.close()
        print("All screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
