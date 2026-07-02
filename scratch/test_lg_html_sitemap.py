import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        print("Loading LG HTML sitemap...")
        try:
            r = await page.goto("https://www.lg.com/in/sitemap", timeout=45000)
            status = r.status if r else "None"
            print(f"Status: {status}")
            
            content = await page.content()
            print(f"Length: {len(content)} bytes")
            
            # Find links
            links = await page.query_selector_all("a")
            print(f"Total links: {len(links)}")
            
            # Log first 30 links
            count = 0
            for link in links:
                href = await link.get_attribute("href")
                text = await link.inner_text()
                if href and "/in/" in href:
                    print(f"  - Link: {href} | Text: {repr(text.strip())}")
                    count += 1
                    if count >= 30:
                        break
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
