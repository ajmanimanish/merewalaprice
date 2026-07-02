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
        
        # LG sitemap
        print("--- LG RAW CONTENT ---")
        try:
            await page.goto("https://www.lg.com/in/sitemap.xml", timeout=30000)
            content = await page.content()
            print(content[:500])
        except Exception as e:
            print("Error loading LG:", e)
            
        # Voltas sitemap
        print("\n--- VOLTAS RAW CONTENT ---")
        try:
            await page.goto("https://www.voltas.com/sitemap_products_1.xml", timeout=30000)
            content = await page.content()
            print(content[:500])
        except Exception as e:
            print("Error loading Voltas:", e)
            
        await browser.close()

asyncio.run(main())
