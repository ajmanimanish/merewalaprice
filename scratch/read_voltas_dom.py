import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()
        
        url = "https://www.voltas.com/sitemap_products_1.xml"
        print(f"Loading Voltas sitemap: {url}...")
        try:
            await page.goto(url, timeout=30000)
            # Evaluate the raw source inside the browser XML viewer
            content = await page.content()
            print(f"Content Length: {len(content)}")
            
            # Print first 2000 characters
            print("\n--- Snippet of parsed XML DOM ---")
            print(content[:2000])
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
