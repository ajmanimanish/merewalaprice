import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.voltas.com/robots.txt"
        print(f"Loading {url}...")
        try:
            await page.goto(url, timeout=30000)
            text = await page.evaluate("() => document.body.innerText")
            print("\n--- robots.txt content ---")
            print(text)
        except Exception as e:
            print("Error:", e)
            
        await browser.close()

asyncio.run(main())
