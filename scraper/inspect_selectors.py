"""
Quick selector inspector — opens Chrome, goes to Amazon search result
for a test product, dumps all price/title element info to help us
build correct selectors for the main scraper.
"""
import asyncio
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

        # ====== AMAZON ======
        print("\n===== AMAZON INSPECTION =====")
        await page.goto("https://www.amazon.in/s?k=Voltas+185V+DZW", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        title = await page.title()
        print(f"Page title: {title}")
        if "captcha" in title.lower():
            print("!!! CAPTCHA DETECTED !!!")
        else:
            results = await page.evaluate("""() => {
                const out = {};
                
                // Count result containers
                out.search_results_count = document.querySelectorAll('[data-component-type="s-search-result"]').length;
                out.asin_items_count = document.querySelectorAll('[data-asin]:not([data-asin=""])').length;
                
                // Price selectors to test
                const priceSelectors = [
                    '.a-price .a-offscreen',
                    '.a-price-whole',
                    '.a-price .a-price-whole',
                    'span[class*="price"]',
                    '.s-price-instructions-style'
                ];
                out.price_selector_results = {};
                for (const sel of priceSelectors) {
                    const els = document.querySelectorAll(sel);
                    out.price_selector_results[sel] = {
                        count: els.length,
                        first_text: els[0] ? els[0].innerText || els[0].textContent : null
                    };
                }
                
                // Title selectors
                const titleSelectors = [
                    'h2 .a-link-normal span',
                    'h2 span.a-text-normal',
                    '.s-title-instructions-style span',
                    'h2 a span'
                ];
                out.title_selector_results = {};
                for (const sel of titleSelectors) {
                    const els = document.querySelectorAll(sel);
                    out.title_selector_results[sel] = {
                        count: els.length,
                        first_text: els[0] ? (els[0].innerText || els[0].textContent || '').substring(0, 100) : null
                    };
                }
                
                // Get first result item's full structure
                const firstItem = document.querySelector('[data-component-type="s-search-result"]');
                if (firstItem) {
                    const priceEl = firstItem.querySelector('.a-price');
                    const offscreen = firstItem.querySelector('.a-price .a-offscreen');
                    const whole = firstItem.querySelector('.a-price-whole');
                    out.first_item_price = {
                        offscreen_text: offscreen ? offscreen.textContent : null,
                        whole_text: whole ? whole.textContent : null,
                        price_html: priceEl ? priceEl.innerHTML.substring(0, 300) : null
                    };
                    
                    const titleEl = firstItem.querySelector('h2 .a-link-normal span') || firstItem.querySelector('h2 span');
                    out.first_item_title = titleEl ? titleEl.textContent.substring(0, 120) : null;
                }
                
                return out;
            }""")
            import json
            print(json.dumps(results, indent=2))

        # ====== FLIPKART ======
        print("\n===== FLIPKART INSPECTION =====")
        await page.goto("https://www.flipkart.com/search?q=Voltas+185V+DZW", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        # Close login popup
        try:
            close = await page.query_selector('button._2KpZ6l._2doB4z')
            if not close:
                close = await page.query_selector('button[class*="close"]')
            if close:
                await close.click()
                await page.wait_for_timeout(500)
        except:
            pass

        fk_results = await page.evaluate("""() => {
            const out = {};
            
            // Count items
            const productSelectors = [
                '[data-id]',
                '._1AtVbE',
                '._13oc-S',
                '._2kHMtA',
                '._4ddWXP',
                'div[class*="col"] a[class*="IRpwTa"]'
            ];
            out.item_counts = {};
            for (const sel of productSelectors) {
                out.item_counts[sel] = document.querySelectorAll(sel).length;
            }
            
            // Price selectors
            const priceSelectors = [
                '._30jeq3',
                '._1vC4OE',
                'div._1_WHN1',
                '._25b18c ._30jeq3',
                'div[class*="price"]',
                '._3qQ9m1',
                '._3tbKJL'
            ];
            out.price_results = {};
            for (const sel of priceSelectors) {
                const els = document.querySelectorAll(sel);
                out.price_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').trim() : null
                };
            }
            
            // Title selectors
            const titleSelectors = [
                '._4rR01T',
                '.WKTcLC',
                'a.s1Q9rs',
                'div._2WkVRV',
                'a[title]',
                '._2B099V'
            ];
            out.title_results = {};
            for (const sel of titleSelectors) {
                const els = document.querySelectorAll(sel);
                out.title_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || els[0].getAttribute('title') || '').substring(0, 100) : null
                };
            }
            
            return out;
        }""")
        import json
        print(json.dumps(fk_results, indent=2))

        # ====== CROMA ======
        print("\n===== CROMA INSPECTION =====")
        await page.goto("https://www.croma.com/searchB?q=Voltas+185V+DZW", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        cr_results = await page.evaluate("""() => {
            const out = {};
            const priceSelectors = [
                '.amount', '.new-price', '.pdp-price', 'span[class*="price"]',
                '[class*="Price"]', '.cp-price', '.price'
            ];
            out.price_results = {};
            for (const sel of priceSelectors) {
                const els = document.querySelectorAll(sel);
                out.price_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').trim().substring(0, 50) : null
                };
            }
            const titleSelectors = [
                'h3.product-title', '.product-title', '.title', 'h3', '[class*="title"]'
            ];
            out.title_results = {};
            for (const sel of titleSelectors) {
                const els = document.querySelectorAll(sel);
                out.title_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').substring(0, 100) : null
                };
            }
            return out;
        }""")
        print(json.dumps(cr_results, indent=2))

        # ====== RELIANCE DIGITAL ======
        print("\n===== RELIANCE DIGITAL INSPECTION =====")
        await page.goto("https://www.reliancedigital.in/search?q=Voltas+185V+DZW%3Arelevance", wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        rd_results = await page.evaluate("""() => {
            const out = {};
            const priceSelectors = [
                '.product-price', '.pd-price', 'span[class*="price"]', '.price',
                '[class*="Price"]', '.sp', '.selling-price'
            ];
            out.price_results = {};
            for (const sel of priceSelectors) {
                const els = document.querySelectorAll(sel);
                out.price_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').trim().substring(0, 50) : null
                };
            }
            const titleSelectors = [
                'p.product-title', '.product-title', '.product-grid__title', 'p.title', '[class*="title"]'
            ];
            out.title_results = {};
            for (const sel of titleSelectors) {
                const els = document.querySelectorAll(sel);
                out.title_results[sel] = {
                    count: els.length,
                    first: els[0] ? (els[0].innerText || '').substring(0, 100) : null
                };
            }
            return out;
        }""")
        print(json.dumps(rd_results, indent=2))

        print("\n\nDone! Close browser manually or wait 10s.")
        await asyncio.sleep(10)
        await browser.close()

asyncio.run(main())
