"""
Debug Croma and Reliance Digital — find what selectors/URL formats actually work.
"""
import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN", timezone_id="Asia/Kolkata"
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await ctx.new_page()

        # ── CROMA ──
        print("\n=== CROMA: trying multiple URL formats ===")
        urls_to_try = [
            "https://www.croma.com/search/?q=Voltas+AC",
            "https://www.croma.com/search/?q=Voltas+split+AC",
            "https://www.croma.com/air-conditioners-coolers/split-air-conditioners/c/343",
        ]
        for url in urls_to_try:
            print(f"\nTrying: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=35000)
            await page.wait_for_timeout(6000)
            # Scroll to trigger lazy load
            await page.evaluate("window.scrollTo(0, 800)")
            await page.wait_for_timeout(2000)

            info = await page.evaluate("""() => {
                const body = document.body.innerText.substring(0, 500);
                
                // Look for price patterns ₹XX,XXX in the entire page
                const allText = document.body.innerText;
                const prices = allText.match(/₹[\\s]?[\\d,]+/g) || [];
                
                // Find product title elements
                const titleCandidates = [];
                for (const sel of ['h3','[class*="title"]','[class*="Title"]','[class*="product"]']) {
                    const els = document.querySelectorAll(sel);
                    for (const el of Array.from(els).slice(0,3)) {
                        const t = (el.innerText||'').trim();
                        if (t && t.length > 15 && t.length < 200) titleCandidates.push(t.substring(0,100));
                    }
                }
                
                // Get first product card link
                const links = document.querySelectorAll('a[href*="/product"], a[href*="/p/"]');
                const firstLink = links[0] ? links[0].getAttribute('href') : null;
                
                return {
                    title: document.title,
                    body_snippet: body,
                    price_texts: prices.slice(0, 10),
                    title_candidates: titleCandidates.slice(0,5),
                    first_product_link: firstLink,
                    total_links: document.querySelectorAll('a').length
                };
            }""")
            print(f"  Page title: {info['title']}")
            print(f"  Price texts found: {info['price_texts']}")
            print(f"  Title candidates: {info['title_candidates']}")
            print(f"  First product link: {info['first_product_link']}")
            if info['price_texts']:
                print("  ✅ PRICES FOUND - this URL works!")
                break

        # ── RELIANCE DIGITAL ──
        print("\n=== RELIANCE DIGITAL: trying multiple URL formats ===")
        rd_urls = [
            "https://www.reliancedigital.in/search?q=Voltas+AC",
            "https://www.reliancedigital.in/air-conditioners/c/AIRCON",
            "https://www.reliancedigital.in/search?q=Voltas+split+air+conditioner",
        ]
        for url in rd_urls:
            print(f"\nTrying: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=35000)
            await page.wait_for_timeout(5000)
            await page.evaluate("window.scrollTo(0, 600)")
            await page.wait_for_timeout(2000)

            info = await page.evaluate("""() => {
                const allText = document.body.innerText;
                const prices = allText.match(/₹[\\s]?[\\d,]+/g) || [];
                
                const titleCandidates = [];
                for (const sel of ['p.product-title','.product-name','h2','h3','[class*="title"]']) {
                    const els = document.querySelectorAll(sel);
                    for (const el of Array.from(els).slice(0,3)) {
                        const t = (el.innerText||'').trim();
                        if (t && t.length > 10 && t.length < 200) titleCandidates.push(t.substring(0,80));
                    }
                }
                
                const links = document.querySelectorAll('a[href*="/product"], a[href*="rldigital"]');
                const firstLink = links[0] ? links[0].getAttribute('href') : null;
                
                return {
                    title: document.title,
                    body_snippet: document.body.innerText.substring(0,300),
                    price_texts: prices.slice(0, 10),
                    title_candidates: titleCandidates.slice(0,5),
                    first_product_link: firstLink
                };
            }""")
            print(f"  Page title: {info['title']}")
            print(f"  Body: {info['body_snippet'][:200]}")
            print(f"  Price texts found: {info['price_texts']}")
            print(f"  Title candidates: {info['title_candidates']}")
            if info['price_texts']:
                print("  ✅ PRICES FOUND - this URL works!")
                break

        print("\nDone. Closing in 5s.")
        await asyncio.sleep(5)
        await browser.close()

asyncio.run(main())
