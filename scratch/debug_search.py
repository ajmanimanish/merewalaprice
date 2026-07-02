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
        
        url = "https://www.amazon.in/s?k=Blue+Star+IE518PNU"
        print(f"Loading {url}...")
        await page.goto(url, timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Check for captcha
        content = await page.content()
        if "enter the characters you see below" in content.lower():
            print("BLOCKED BY CAPTCHA")
            await browser.close()
            return
            
        print("Page loaded successfully! Searching for links...")
        
        # Get all link elements with titles
        links = await page.query_selector_all("a")
        print(f"Total links on page: {len(links)}")
        
        count = 0
        for link in links:
            href = await link.get_attribute("href")
            text = await link.inner_text()
            if href and "/dp/" in href:
                print(f"Link {count}: Href={href[:60]}, Text={text.strip()[:60]}")
                count += 1
                if count > 15:
                    break
                    
        await browser.close()

asyncio.run(main())
