"""
Local Playwright Script to capture a screenshot of the Home page at http://localhost:3000/
"""
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
        page = await context.new_page()
        
        print("Navigating to http://localhost:3000/...")
        await page.goto("http://localhost:3000/", wait_until="networkidle", timeout=30000)
        
        # Additional wait for Supabase state hydration
        await page.wait_for_timeout(3000)
        
        screenshot_path = "/Users/manish/.gemini/antigravity/brain/f74b75c5-0120-4d33-95e2-c389adab415b/home_page_screenshot.png"
        print(f"Capturing screenshot to {screenshot_path}...")
        await page.screenshot(path=screenshot_path, full_page=True)
        print("Screenshot captured successfully!")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
