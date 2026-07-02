import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        print("Launching Chromium in GUI mode...")
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        urls = [
            "https://www.whirlpoolindia.com/",
            "https://www.whirlpoolindia.com/sitemap.xml"
        ]
        
        for url in urls:
            print(f"\nLoading: {url}...")
            try:
                r = await page.goto(url, timeout=30000)
                status = r.status if r else "None"
                print(f"  -> Status: {status}")
                content = await page.content()
                print(f"  -> Length: {len(content)} bytes")
                body_text = await page.evaluate("() => document.body.innerText")
                print(f"  -> Snippet: {repr(body_text[:200])}")
            except Exception as e:
                print(f"  -> Error: {e}")
                
        await browser.close()

asyncio.run(main())
