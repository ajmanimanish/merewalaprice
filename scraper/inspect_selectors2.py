"""
Deep-dive inspection of Flipkart, Croma and Reliance Digital
to find working price/title selectors after their class name changes.
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN",
            timezone_id="Asia/Kolkata"
        )
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await context.new_page()

        # ====== FLIPKART deep dive ======
        print("\n===== FLIPKART DEEP DIVE =====")
        await page.goto("https://www.flipkart.com/search?q=Voltas+185V+DZW+AC", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(4000)

        # Close login popup
        try:
            for sel in ['button._2KpZ6l._2doB4z', 'button[class*="close"]', '._2AkmmA button']:
                btn = await page.query_selector(sel)
                if btn:
                    await btn.click()
                    await page.wait_for_timeout(500)
                    break
        except:
            pass

        fk = await page.evaluate("""() => {
            const out = {};
            // Get innerHTML of first [data-id] item to understand structure
            const items = document.querySelectorAll('[data-id]');
            out.item_count = items.length;
            if (items.length > 0) {
                out.first_item_html = items[0].innerHTML.substring(0, 2000);
                out.first_item_classes = items[0].className;
            }
            // Try to get all text nodes with rupee sign
            const allText = document.body.innerText;
            const priceMatches = allText.match(/[₹\\d][\\d,]+/g);
            out.price_candidates = priceMatches ? priceMatches.slice(0, 20) : [];
            
            // Try common 2024 Flipkart selectors
            const selectors2024 = [
                '._2Tpdn3 ._30jeq3',
                'div.Nx9bqj',
                'div.yRaY8j',
                'div._4b5DiR',
                '._1fQZEK',
                'div[class*="CxhGGd"]',
                '._11pzQk',
            ];
            out.new_selectors = {};
            for (const s of selectors2024) {
                const els = document.querySelectorAll(s);
                out.new_selectors[s] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').trim().substring(0, 60) : null
                };
            }
            return out;
        }""")
        print("FLIPKART:")
        print(f"  Item count ([data-id]): {fk.get('item_count')}")
        print(f"  Price candidates: {fk.get('price_candidates')}")
        print(f"  New selectors: {json.dumps(fk.get('new_selectors'), indent=4)}")
        print(f"\n  First item HTML (first 1000 chars):")
        print(fk.get('first_item_html', '')[:1000])

        # ====== CROMA deep dive ======
        print("\n===== CROMA DEEP DIVE =====")
        await page.goto("https://www.croma.com/searchB?q=Voltas+AC", wait_until="networkidle", timeout=45000)
        await page.wait_for_timeout(5000)
        
        cr = await page.evaluate("""() => {
            const out = {};
            out.url = location.href;
            out.title = document.title;
            
            // Get body text snippet 
            out.body_snippet = document.body.innerText.substring(0, 1000);
            
            // Try various price selectors
            const sels = [
                '.amount', '.plp-srp-new-amount', 'span.plp-srp-new-amount',
                '[class*="amount"]', '[class*="Amount"]',
                'p.price', '.offer-price', 
                '.new-price-wrap', '.price-wrap',
                'div[class*="Price"]', 'span[class*="Price"]',
                'li.product-price', '.product-price',
                'p[class*="price"]', 'p[class*="Price"]',
                '[itemprop="price"]'
            ];
            out.price_results = {};
            for (const sel of sels) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) {
                    out.price_results[sel] = {
                        count: els.length,
                        first: els[0].innerText.trim().substring(0, 60)
                    };
                }
            }
            
            // Get first product card HTML
            const cards = document.querySelectorAll('li.product-item, article, [class*="product"]');
            out.card_count = cards.length;
            if (cards.length > 0) {
                out.first_card_html = cards[0].innerHTML.substring(0, 1500);
            }
            
            return out;
        }""")
        print(f"Croma URL: {cr.get('url')}")
        print(f"Croma Title: {cr.get('title')}")
        print(f"Body snippet: {cr.get('body_snippet', '')[:300]}")
        print(f"Card count: {cr.get('card_count')}")
        print(f"Price results: {json.dumps(cr.get('price_results'), indent=2)}")
        if cr.get('first_card_html'):
            print(f"\nFirst card HTML:\n{cr['first_card_html'][:1200]}")

        # ====== RELIANCE DIGITAL deep dive ======
        print("\n===== RELIANCE DIGITAL DEEP DIVE =====")
        await page.goto("https://www.reliancedigital.in/search?q=Voltas+AC%3Arelevance", wait_until="networkidle", timeout=45000)
        await page.wait_for_timeout(5000)
        
        rd = await page.evaluate("""() => {
            const out = {};
            out.url = location.href;
            out.title = document.title;
            out.body_snippet = document.body.innerText.substring(0, 800);
            
            const sels = [
                '.sp', 'span.sp', '.product-price', 'li.product-item',
                '[class*="price"]', '[class*="Price"]',
                '.Text__medium', 'p.Text__medium',
                'span[class*="Text"]', 'div[class*="Price"]',
                '.selling-price', '.final-price',
                '[data-testid*="price"]', 'strong'
            ];
            out.price_results = {};
            for (const sel of sels) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) {
                    out.price_results[sel] = {
                        count: els.length,
                        first: els[0].innerText.trim().substring(0, 60)
                    };
                }
            }
            
            // Find product cards
            const cards = document.querySelectorAll('li.product-grid__item, [class*="product"]');
            out.card_count = cards.length;
            if (cards.length > 0) {
                out.first_card_html = cards[0].innerHTML.substring(0, 1500);
            }
            
            return out;
        }""")
        print(f"Reliance URL: {rd.get('url')}")
        print(f"Reliance Title: {rd.get('title')}")
        print(f"Body snippet: {rd.get('body_snippet', '')[:400]}")
        print(f"Card count: {rd.get('card_count')}")
        print(f"Price results: {json.dumps(rd.get('price_results'), indent=2)}")
        if rd.get('first_card_html'):
            print(f"\nFirst card HTML:\n{rd['first_card_html'][:1200]}")

        print("\n\nDone! Closing in 5s.")
        await asyncio.sleep(5)
        await browser.close()

asyncio.run(main())
