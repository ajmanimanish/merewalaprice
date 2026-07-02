import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        # Launching Chromium in GUI mode (headless=False)
        print("Launching Chromium in non-headless GUI mode...")
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        url = "https://www.lg.com/in/sitemap.xml"
        print(f"Loading LG sitemap: {url}...")
        try:
            r = await page.goto(url, timeout=30000)
            status = r.status if r else "None"
            print(f"Status: {status}")
            
            content = await page.content()
            print(f"Length: {len(content)} bytes")
            
            # Check for loc tags
            urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
            print(f"Found {len(urls)} URLs.")
            if urls:
                print("First 5 URLs:")
                for u in urls[:5]:
                    print(" -", u)
            else:
                print(f"Snippet: {repr(content[:500])}")
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
