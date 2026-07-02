import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Bypassing HTTPS certificate checks
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        urls = [
            "https://www.whirlpool.in/robots.txt",
            "https://www.whirlpool.in/sitemap.xml",
            "https://www.whirlpool.in/sitemap_index.xml"
        ]
        
        for url in urls:
            print(f"\nLoading: {url}...")
            try:
                r = await page.goto(url, timeout=30000)
                status = r.status if r else "None"
                content = await page.content()
                print(f"  -> Status: {status} | Length: {len(content)}")
                body_text = await page.evaluate("() => document.body.innerText")
                print(f"  -> Body snippet: {repr(body_text[:200])}")
            except Exception as e:
                print(f"  -> Error: {e}")
                
        await browser.close()

asyncio.run(main())
