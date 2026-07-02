"""
Debug: type directly into Croma's search box (like a real user)
and check if it finds products. Also test pin code flow.
"""
import asyncio, json
from playwright.async_api import async_playwright

BHOPAL_PIN = "462001"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-IN", timezone_id="Asia/Kolkata"
        )
        await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false });")
        page = await ctx.new_page()

        # ── Step 1: Set Bhopal pin ──
        print("=== Step 1: Set Bhopal pin on Croma ===")
        await page.goto("https://www.croma.com/", wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(3000)

        try:
            # Click the Add Pincode button (class confirmed: add-pincode-link)
            await page.click("button.add-pincode-link", timeout=5000)
            await page.wait_for_timeout(2000)
            print("Clicked Add Pincode button")

            # Dump what appeared after click
            modal_info = await page.evaluate("""() => {
                const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                    type: i.type, placeholder: i.placeholder,
                    maxlength: i.maxLength, visible: i.offsetParent !== null
                }));
                const buttons = Array.from(document.querySelectorAll('button')).slice(0, 20).map(b => ({
                    text: (b.innerText||'').trim().substring(0,40),
                    cls: b.className.substring(0,60),
                    visible: b.offsetParent !== null
                })).filter(b => b.text || b.cls);
                return { inputs, buttons_visible: buttons.filter(b => b.visible) };
            }""")
            print(f"Inputs after click: {modal_info['inputs']}")
            print(f"Visible buttons: {modal_info['buttons_visible']}")

            # Try filling any visible 6-char input
            filled = False
            for inp_info in modal_info['inputs']:
                if inp_info['visible'] and inp_info['maxlength'] == 6:
                    await page.fill(f"input[maxlength='6']", BHOPAL_PIN)
                    await page.wait_for_timeout(500)
                    await page.press(f"input[maxlength='6']", "Enter")
                    await page.wait_for_timeout(2000)
                    print(f"Filled pin: {BHOPAL_PIN}")
                    filled = True
                    break

            if not filled:
                # Try any input that becomes visible
                await page.fill("input[type='text']:visible", BHOPAL_PIN)
                await page.press("input[type='text']:visible", "Enter")
                await page.wait_for_timeout(2000)
                print("Filled pin via visible text input")

        except Exception as e:
            print(f"Pin error: {e}")

        # Check current state after pin
        pin_check = await page.evaluate("() => document.body.innerText.substring(0, 200)")
        print(f"Page after pin: {pin_check}")

        # ── Step 2: Search via search box ──
        print("\n=== Step 2: Use Croma search box for 'Voltas 185V' ===")
        try:
            # Click the search input
            search_inp = await page.query_selector("input[name='search'], input[placeholder*='looking for']")
            if search_inp:
                await search_inp.click()
                await page.wait_for_timeout(500)
                await search_inp.fill("Voltas 185V DZW")
                await page.wait_for_timeout(1000)
                await search_inp.press("Enter")
                await page.wait_for_timeout(5000)
                print(f"Searched. URL: {page.url}")

                # Scroll and wait
                await page.evaluate("window.scrollTo(0, 600)")
                await page.wait_for_timeout(3000)

                search_result = await page.evaluate("""() => {
                    const body = document.body.innerText;
                    const rupees = body.match(/₹[\\s]?[\\d,]+/g) || [];
                    const links = Array.from(document.querySelectorAll('a[href*="/p/"]')).slice(0,5).map(a => ({
                        href: a.href, text: (a.innerText||'').trim().substring(0,60)
                    }));
                    return {
                        url: location.href,
                        title: document.title,
                        rupees: rupees.slice(0,10),
                        product_links: links,
                        body_snippet: body.substring(0, 400)
                    };
                }""")
                print(f"URL: {search_result['url']}")
                print(f"Title: {search_result['title']}")
                print(f"Rupees found: {search_result['rupees']}")
                print(f"Product links: {json.dumps(search_result['product_links'], indent=2)}")
                print(f"Body: {search_result['body_snippet'][:300]}")
            else:
                print("Search input NOT found!")
        except Exception as e:
            print(f"Search error: {e}")

        # ── Step 3: Try direct Croma product URL construction ──
        print("\n=== Step 3: Direct Croma product page (known URL) ===")
        await page.goto(
            "https://www.croma.com/samsung-ar60-5-in-1-convertible-1-5-ton-3-star-inverter-split-smart-ac-with-voice-assistant-2026-model-copper-condenser-ar60h19d13wnna-/p/320456",
            wait_until="domcontentloaded", timeout=30000
        )
        await page.wait_for_timeout(4000)
        price_info = await page.evaluate("""() => {
            const a = document.querySelector('span.amount');
            const n = document.querySelector('.new-price');
            const pin = document.body.innerText.match(/\\d{6}/)?.[0];
            return {
                span_amount: a ? a.innerText.trim() : null,
                new_price: n ? n.innerText.trim() : null,
                pin_shown: pin
            };
        }""")
        print(f"span.amount: {price_info['span_amount']}")
        print(f".new-price: {price_info['new_price']}")
        print(f"Pin shown on page: {price_info['pin_shown']}")

        print("\nDone. Closing in 10s.")
        await asyncio.sleep(10)
        await browser.close()

asyncio.run(main())
