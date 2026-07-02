"""
Test two approaches for Croma:
1. Direct product detail page (user suggestion)
2. Google search "{model} price croma" to get price from snippet
"""
import asyncio, json, re
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

        # ── TEST 1: Direct Croma product page ──
        print("\n=== TEST 1: Croma Direct Product Page ===")
        url = "https://www.croma.com/samsung-ar60-5-in-1-convertible-1-5-ton-3-star-inverter-split-smart-ac-with-voice-assistant-2026-model-copper-condenser-ar60h19d13wnna-/p/320456"
        print(f"URL: {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=35000)
        await page.wait_for_timeout(5000)

        result1 = await page.evaluate("""() => {
            // Get all text with rupee symbol
            const allText = document.body.innerText;
            const rupeeMatches = allText.match(/₹[\\s]?[\\d,]+/g) || [];
            
            // Try specific product page price selectors
            const selectors = [
                '.pdp-price', '[class*="pdpPrice"]', '[class*="PdpPrice"]',
                '.offer-price', '[class*="offerPrice"]',
                '.new-price', '[class*="newPrice"]',
                '[class*="price"]', '[class*="Price"]',
                '[itemprop="price"]', '[itemprop="offers"]',
                'meta[itemprop="price"]',
                '.plp-srp-new-amount', 'span.amount'
            ];
            const found = {};
            for (const sel of selectors) {
                const els = document.querySelectorAll(sel);
                if (els.length > 0) {
                    const texts = Array.from(els).map(e => (e.innerText || e.getAttribute('content') || '').trim()).filter(t => t);
                    if (texts.length) found[sel] = texts.slice(0,3);
                }
            }
            
            // Get page title
            const title = document.title;
            
            // Get meta price if any
            const metaPrice = document.querySelector('meta[itemprop="price"]');
            const metaPriceVal = metaPrice ? metaPrice.getAttribute('content') : null;
            
            return {
                title,
                rupee_texts: rupeeMatches.slice(0, 15),
                selector_hits: found,
                meta_price: metaPriceVal,
                body_snippet: allText.substring(0, 500)
            };
        }""")
        print(f"Page title: {result1['title']}")
        print(f"Meta price: {result1['meta_price']}")
        print(f"Rupee texts found: {result1['rupee_texts']}")
        print(f"Selector hits: {json.dumps(result1['selector_hits'], indent=2)}")
        print(f"Body snippet:\n{result1['body_snippet'][:400]}")

        # ── TEST 2: Croma category page ──
        print("\n=== TEST 2: Croma Category Page (ACs) ===")
        await page.goto("https://www.croma.com/home-appliances/air-conditioners/c/46",
                        wait_until="domcontentloaded", timeout=35000)
        await page.wait_for_timeout(6000)
        # Scroll to trigger lazy loading
        await page.evaluate("window.scrollTo(0, 1000)")
        await page.wait_for_timeout(3000)

        result2 = await page.evaluate("""() => {
            const allText = document.body.innerText;
            const rupeeMatches = allText.match(/₹[\\s]?[\\d,]+/g) || [];
            
            // Look for product cards
            const cards = document.querySelectorAll('li, article, [class*="product"]');
            const cardTexts = Array.from(cards).slice(0,5).map(c => (c.innerText||'').substring(0,200));
            
            return {
                title: document.title,
                rupee_texts: rupeeMatches.slice(0,15),
                card_count: cards.length,
                first_cards: cardTexts,
                body_snippet: allText.substring(0, 800)
            };
        }""")
        print(f"Category page title: {result2['title']}")
        print(f"Rupee texts: {result2['rupee_texts']}")
        print(f"Card count: {result2['card_count']}")
        print(f"Body snippet:\n{result2['body_snippet'][:400]}")

        # ── TEST 3: Google search for Croma price ──
        print("\n=== TEST 3: Google Search - 'Samsung AR18CYNYBWK price croma' ===")
        await page.goto(
            "https://www.google.com/search?q=Samsung+AR18CYNYBWK+price+croma&gl=in&hl=en",
            wait_until="domcontentloaded", timeout=30000
        )
        await page.wait_for_timeout(3000)

        result3 = await page.evaluate("""() => {
            // Get all search result snippets
            const snippets = Array.from(document.querySelectorAll('.VwiC3b, .lyLwlc, .IsZvec, [class*="snippet"]'))
                .map(e => (e.innerText||'').trim())
                .filter(t => t.length > 10)
                .slice(0, 10);
            
            // Get all links with croma.com
            const cromaLinks = Array.from(document.querySelectorAll('a[href*="croma.com"]'))
                .map(a => ({href: a.href, text: (a.innerText||'').trim().substring(0,80)}))
                .filter(x => x.href && x.href.includes('croma.com'))
                .slice(0,5);
            
            // Get price-like text from snippets
            const allText = document.body.innerText;
            const rupeeMatches = allText.match(/₹[\\s]?[\\d,]+/g) || [];
            
            return {
                snippets,
                croma_links: cromaLinks,
                rupee_texts: rupeeMatches.slice(0, 20)
            };
        }""")
        print(f"Snippets: {json.dumps(result3['snippets'], indent=2)}")
        print(f"Croma links: {json.dumps(result3['croma_links'], indent=2)}")
        print(f"Rupee texts: {result3['rupee_texts']}")

        # ── TEST 4: Google Shopping for Croma ──
        print("\n=== TEST 4: Google Shopping - 'Voltas 185V DZW' ===")
        await page.goto(
            "https://www.google.com/search?q=Voltas+185V+DZW+split+AC&tbm=shop&gl=in&hl=en",
            wait_until="domcontentloaded", timeout=30000
        )
        await page.wait_for_timeout(3000)

        result4 = await page.evaluate("""() => {
            // Shopping results
            const items = Array.from(document.querySelectorAll('.sh-dgr__gr-auto, .sh-dlr__list-result, [class*="product"]'));
            const results = items.slice(0,10).map(item => {
                const title = (item.querySelector('[class*="title"], h3, h4') || {innerText:''}).innerText;
                const price = (item.querySelector('[class*="price"], .T14wmb') || {innerText:''}).innerText;
                const store = (item.querySelector('[class*="merchant"], [class*="store"]') || {innerText:''}).innerText;
                return {title: title.substring(0,80), price, store: store.substring(0,40)};
            }).filter(x => x.price || x.title);
            
            const allText = document.body.innerText;
            const rupeeMatches = allText.match(/₹[\\s]?[\\d,]+/g) || [];
            
            return {
                shopping_results: results,
                all_prices: rupeeMatches.slice(0,20),
                body_snippet: allText.substring(0, 1000)
            };
        }""")
        print(f"Shopping results: {json.dumps(result4['shopping_results'], indent=2)}")
        print(f"All price texts: {result4['all_prices']}")
        print(f"\nBody snippet:\n{result4['body_snippet'][:600]}")

        print("\n\nAll tests done! Closing in 8s...")
        await asyncio.sleep(8)
        await browser.close()

asyncio.run(main())
