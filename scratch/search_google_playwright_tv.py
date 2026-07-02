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
        
        query = "Samsung UA43CUE60AKLXL site:amazon.in"
        url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        print(f"Searching Google: {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Save screenshot
        await page.screenshot(path="google_search_tv.png")
        
        links = await page.query_selector_all("a")
        print(f"Total links: {len(links)}")
        for link in links:
            href = await link.get_attribute("href")
            text = await link.inner_text()
            if href and "amazon.in" in href:
                print(f"Href: {href[:100]} | Text: {text.strip()[:60]}")
                
        await browser.close()

asyncio.run(main())
