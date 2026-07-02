import asyncio
from playwright.async_api import async_playwright

urls = [
    {"brand": "Voltas Products", "url": "https://www.voltas.com/sitemap_products_1.xml"},
    {"brand": "Whirlpool Sitemap", "url": "https://www.whirlpoolindia.com/sitemap.xml"},
    {"brand": "Voltas Homepage", "url": "https://www.voltas.com/"},
    {"brand": "Whirlpool Homepage", "url": "https://www.whirlpoolindia.com/"}
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for item in urls:
            print(f"\nLoading {item['brand']} ({item['url']})...")
            try:
                # Set a lower timeout to avoid waiting too long if it hangs
                r = await page.goto(item["url"], timeout=30000)
                status = r.status if r else "None"
                content = await page.content()
                print(f"  -> Response Status: {status} | Content Length: {len(content)}")
                # Log first 200 chars of body
                body_text = await page.evaluate("() => document.body.innerText")
                print(f"  -> Body snippet: {repr(body_text[:200])}")
            except Exception as e:
                print(f"  -> Error loading: {e}")
                
        await browser.close()

asyncio.run(main())
