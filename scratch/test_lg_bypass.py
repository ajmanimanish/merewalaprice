import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        # Step 1: Open Homepage to get cookies
        print("Loading LG India homepage...")
        try:
            await page.goto("https://www.lg.com/in/", timeout=45000, wait_until="networkidle")
            print("Successfully loaded homepage! Waiting 5s...")
            await page.wait_for_timeout(5000)
            
            # Step 2: Open Sitemap XML
            print("Navigating to LG Sitemap XML...")
            r = await page.goto("https://www.lg.com/in/sitemap.xml", timeout=45000)
            status = r.status if r else "None"
            print(f"Sitemap Status: {status}")
            
            # Check content
            content = await page.content()
            print(f"Content Length: {len(content)} bytes")
            
            # Extract URLs
            urls = re.findall(r'<loc>(https?://[^<]+)</loc>', content)
            if not urls:
                # Try getting text
                text = await page.evaluate("() => document.body.innerText")
                urls = re.findall(r'https?://[^\s]+', text)
                
            print(f"Found {len(urls)} URLs.")
            if urls:
                print("First 10 URLs:")
                for u in urls[:10]:
                    print(f"  - {u}")
            else:
                print(f"Snippet: {repr(content[:500])}")
                
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
