import asyncio
from playwright.async_api import async_playwright
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        url = "https://www.amazon.in/dp/B0F6CFJF78"
        print(f"Loading {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Log titles
        title_el = await page.query_selector("span#productTitle")
        title = await title_el.inner_text() if title_el else "None"
        print("Title:", title.strip())
        
        # Check all price selectors
        selectors = [
            "span.a-price-whole",
            "span.a-price.a-text-price span.a-offscreen",
            "span.a-price.a-text-price",
            "span.basisPrice span.a-offscreen",
            "span.a-size-small.a-color-secondary.a-text-strike",
            "#corePriceDisplay_desktop_feature_div span.a-text-strike"
        ]
        
        for sel in selectors:
            el = await page.query_selector(sel)
            if el:
                text = await el.inner_text()
                html = await el.inner_html()
                print(f"Selector '{sel}': Text={repr(text)}, HTML={repr(html)}")
                
        await browser.close()

asyncio.run(main())
