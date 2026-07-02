import asyncio
from playwright.async_api import async_playwright
import re

asins = ["B0F43H82FW", "B0F84DKX8K"]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for asin in asins:
            url = f"https://www.amazon.in/dp/{asin}"
            print(f"\nLoading {url}...")
            await page.goto(url, timeout=30000)
            await page.wait_for_timeout(3000)
            
            title_el = await page.query_selector("span#productTitle")
            title = (await title_el.inner_text()).strip() if title_el else "None"
            print("Title:", title)
            
            specs = {}
            rows = await page.query_selector_all("table.prodDetTable tr")
            for row in rows:
                label_el = await row.query_selector("th")
                val_el = await row.query_selector("td")
                if label_el and val_el:
                    lbl = (await label_el.inner_text()).strip()
                    val = (await val_el.inner_text()).strip()
                    specs[lbl] = val
                    
            if len(specs) < 3:
                rows2 = await page.query_selector_all("#technicalSpecifications_section_1 tr")
                for row in rows2:
                    label_el = await row.query_selector("td.label")
                    val_el = await row.query_selector("td.value")
                    if label_el and val_el:
                        lbl = (await label_el.inner_text()).strip()
                        val = (await val_el.inner_text()).strip()
                        specs[lbl] = val
                        
            print("Specs:")
            for k, v in list(specs.items())[:10]:
                print(f"  - {k}: {v.strip()}")
                
        await browser.close()

asyncio.run(main())
